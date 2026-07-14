import { spawn } from "node:child_process";
import { createReadStream, createWriteStream } from "node:fs";
import { copyFile, mkdir, unlink, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { BadRequestException, Injectable, InternalServerErrorException, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

type Engine = "sqlite" | "postgresql" | "mysql";

export interface BackupStream {
  stream: NodeJS.ReadableStream;
  fileName: string;
  contentType: string;
}

/**
 * Engine-aware database backup/restore for the platform admin panel.
 * Postgres is the tested path (the production default per DEPLOY.md);
 * SQLite works for local dev; MySQL is implemented for completeness of the
 * cross-engine story but never wired into docker-compose or exercised
 * against a real MySQL server in this codebase, same caveat as the PayU/
 * Stripe/Cashfree payment gateways being config-only.
 *
 * Restore is the most destructive action in the app -- it replaces the
 * ENTIRE database for every organization on this deployment, not just one.
 * Two safety rails live here (a third, the typed "RESTORE" confirmation, is
 * enforced in the controller): the uploaded file's content is checked
 * against the current engine's real format before touching anything, and a
 * fresh backup of the CURRENT state is written to disk immediately before
 * the restore runs, so a bad restore is itself recoverable.
 */
@Injectable()
export class DatabaseBackupService {
  private readonly logger = new Logger(DatabaseBackupService.name);
  private readonly backupsDir: string;

  constructor(private readonly prisma: PrismaService) {
    this.backupsDir = resolve(process.cwd(), process.env.BACKUPS_DIR ?? "./backups");
  }

  private engine(): Engine {
    return (process.env.DATABASE_PROVIDER as Engine | undefined) ?? "sqlite";
  }

  private databaseUrl(): string {
    const url = process.env.DATABASE_URL;
    if (!url) throw new InternalServerErrorException("DATABASE_URL is not set");
    return url;
  }

  /**
   * Locates the SQLite file via the installed @sitetrack/database package's
   * real location (a pnpm workspace symlink), not a guessed relative path --
   * process.cwd() differs between local dev (apps/api/) and the Docker image
   * (/repo), so a cwd-relative guess would silently break in one of them.
   */
  private sqliteFilePath(): string {
    const relative = this.databaseUrl().replace(/^file:/, "");
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const dbPackageJson = require.resolve("@sitetrack/database/package.json");
    return resolve(dirname(dbPackageJson), "prisma", relative);
  }

  private timestamp(): string {
    return new Date().toISOString().replace(/[:.]/g, "-");
  }

  // --- Backup (on-demand download, no server-side retention) ---

  async createBackupStream(): Promise<BackupStream> {
    const engine = this.engine();
    const fileName = `sitetrack-backup-${this.timestamp()}.${this.extensionFor(engine)}`;

    if (engine === "sqlite") {
      return { stream: createReadStream(this.sqliteFilePath()), fileName, contentType: "application/octet-stream" };
    }
    if (engine === "postgresql") {
      const child = spawn("pg_dump", ["--format=custom", "--no-owner", "--no-acl", this.databaseUrl()]);
      this.logStderr(child, "pg_dump");
      return { stream: child.stdout, fileName, contentType: "application/octet-stream" };
    }
    // mysql
    const { args, env } = this.mysqlArgs("dump");
    const child = spawn("mysqldump", args, { env });
    this.logStderr(child, "mysqldump");
    return { stream: child.stdout, fileName, contentType: "application/sql" };
  }

  private extensionFor(engine: Engine): string {
    if (engine === "sqlite") return "db";
    if (engine === "postgresql") return "dump";
    return "sql";
  }

  // --- Restore (destructive -- see class docstring for the safety rails) ---

  async restoreFromBuffer(buffer: Buffer): Promise<{ snapshotFileName: string }> {
    const engine = this.engine();
    this.validateFormat(engine, buffer);

    const snapshotFileName = await this.takeSafetySnapshot(engine);

    try {
      if (engine === "sqlite") {
        await this.restoreSqlite(buffer);
      } else if (engine === "postgresql") {
        await this.restorePostgres(buffer);
      } else {
        await this.restoreMysql(buffer);
      }
    } finally {
      // The current client's connection(s) may now point at a dropped/
      // recreated schema generation -- disconnecting forces a fresh
      // connection (and fresh prepared statements) on the next query,
      // rather than reusing stale state from before the restore.
      await this.prisma.unscoped.$disconnect().catch(() => undefined);
    }

    return { snapshotFileName };
  }

  private validateFormat(engine: Engine, buffer: Buffer) {
    if (buffer.length < 16) throw new BadRequestException("Uploaded file is too small to be a valid backup");

    if (engine === "sqlite") {
      if (buffer.subarray(0, 16).toString("latin1") !== "SQLite format 3\0") {
        throw new BadRequestException("This doesn't look like a SQLite database file");
      }
      return;
    }
    if (engine === "postgresql") {
      // pg_dump custom format ("-Fc") signature -- see pg_backup_archiver.h.
      if (buffer.subarray(0, 5).toString("latin1") !== "PGDMP") {
        throw new BadRequestException(
          "This doesn't look like a pg_dump custom-format backup (expected a file created by this panel's Download Backup button)"
        );
      }
      return;
    }
    // mysql: plain SQL text, no binary signature to check -- a light sanity
    // check instead of no check at all.
    const head = buffer.subarray(0, Math.min(buffer.length, 200)).toString("utf8");
    if (!/create table|insert into|--/i.test(head)) {
      throw new BadRequestException("This doesn't look like a MySQL SQL dump");
    }
  }

  private async takeSafetySnapshot(engine: Engine): Promise<string> {
    await mkdir(this.backupsDir, { recursive: true });
    const fileName = `pre-restore-${this.timestamp()}.${this.extensionFor(engine)}`;
    const destPath = join(this.backupsDir, fileName);

    if (engine === "sqlite") {
      await copyFile(this.sqliteFilePath(), destPath);
    } else if (engine === "postgresql") {
      await this.runToFile("pg_dump", ["--format=custom", "--no-owner", "--no-acl", this.databaseUrl()], destPath);
    } else {
      const { args, env } = this.mysqlArgs("dump");
      await this.runToFile("mysqldump", args, destPath, env);
    }

    this.logger.warn(`Pre-restore safety snapshot written: ${fileName}`);
    return fileName;
  }

  private async restoreSqlite(buffer: Buffer) {
    const filePath = this.sqliteFilePath();
    await writeFile(filePath, buffer);
  }

  private async restorePostgres(buffer: Buffer) {
    await mkdir(this.backupsDir, { recursive: true });
    const tempPath = join(this.backupsDir, `tmp-restore-${this.timestamp()}.dump`);
    // Written to a real file rather than piped over stdin: pg_restore's
    // custom format seeks within its input, which an unseekable stdin pipe
    // doesn't support for every operation.
    await writeFile(tempPath, buffer);
    try {
      await this.run("pg_restore", [
        "--clean",
        "--if-exists",
        "--no-owner",
        "--no-acl",
        "--dbname",
        this.databaseUrl(),
        tempPath,
      ]);
    } finally {
      await unlink(tempPath).catch(() => undefined);
    }
  }

  private async restoreMysql(buffer: Buffer) {
    const { args, env } = this.mysqlArgs("restore");
    await this.runWithStdin("mysql", args, buffer, env);
  }

  private mysqlArgs(mode: "dump" | "restore"): { args: string[]; env: NodeJS.ProcessEnv } {
    const url = new URL(this.databaseUrl());
    const database = url.pathname.replace(/^\//, "");
    const args = [
      `--host=${url.hostname}`,
      `--port=${url.port || "3306"}`,
      `--user=${decodeURIComponent(url.username)}`,
      ...(mode === "dump" ? ["--databases", database] : [database]),
    ];
    // Password via env var, not argv -- avoids it showing up in `ps`.
    return { args, env: { ...process.env, MYSQL_PWD: decodeURIComponent(url.password) } };
  }

  private run(command: string, args: string[]): Promise<void> {
    return new Promise((resolvePromise, reject) => {
      const child = spawn(command, args);
      this.logStderr(child, command);
      child.on("error", reject);
      child.on("close", (code) =>
        code === 0 ? resolvePromise() : reject(new InternalServerErrorException(`${command} exited with code ${code}`))
      );
    });
  }

  private runToFile(command: string, args: string[], destPath: string, env?: NodeJS.ProcessEnv): Promise<void> {
    return new Promise((resolvePromise, reject) => {
      const child = spawn(command, args, env ? { env } : undefined);
      this.logStderr(child, command);
      child.stdout.pipe(createWriteStream(destPath));
      child.on("error", reject);
      child.on("close", (code) =>
        code === 0 ? resolvePromise() : reject(new InternalServerErrorException(`${command} exited with code ${code}`))
      );
    });
  }

  private runWithStdin(command: string, args: string[], input: Buffer, env?: NodeJS.ProcessEnv): Promise<void> {
    return new Promise((resolvePromise, reject) => {
      const child = spawn(command, args, env ? { env } : undefined);
      this.logStderr(child, command);
      child.on("error", reject);
      child.on("close", (code) =>
        code === 0 ? resolvePromise() : reject(new InternalServerErrorException(`${command} exited with code ${code}`))
      );
      child.stdin.write(input);
      child.stdin.end();
    });
  }

  private logStderr(child: import("node:child_process").ChildProcess, label: string) {
    child.stderr?.on("data", (chunk) => this.logger.debug(`[${label}] ${chunk.toString().trim()}`));
  }
}

import { BadRequestException } from "@nestjs/common";
import { DatabaseBackupService } from "./database-backup.service";

/**
 * Format validation runs BEFORE any subprocess is spawned or any file is
 * touched, so these are safe to test without pg_dump/mysqldump installed
 * and without ever running a real restore -- exactly the cases where a
 * bad/wrong-engine file must be rejected instead of corrupting the database.
 */
// engine()/databaseUrl() read process.env lazily on every call (not cached
// at construction), so the env vars must stay set for the test's duration --
// restored in afterEach, not right after construction.
const originalProvider = process.env.DATABASE_PROVIDER;
const originalUrl = process.env.DATABASE_URL;

afterEach(() => {
  process.env.DATABASE_PROVIDER = originalProvider;
  process.env.DATABASE_URL = originalUrl;
});

function makeService(provider: string) {
  process.env.DATABASE_PROVIDER = provider;
  process.env.DATABASE_URL = provider === "sqlite" ? "file:./dev.db" : "postgresql://u:p@localhost:5432/db";
  return new DatabaseBackupService({} as any);
}

describe("DatabaseBackupService restore format validation", () => {
  it("rejects a file too small to be any real backup", async () => {
    const svc = makeService("postgresql");
    await expect(svc.restoreFromBuffer(Buffer.from("short"))).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects a non-pg_dump file when the engine is postgresql", async () => {
    const svc = makeService("postgresql");
    const notADump = Buffer.concat([Buffer.from("NOTREAL"), Buffer.alloc(20)]);
    await expect(svc.restoreFromBuffer(notADump)).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects a non-SQLite file when the engine is sqlite", async () => {
    const svc = makeService("sqlite");
    const notSqlite = Buffer.concat([Buffer.from("PGDMP"), Buffer.alloc(20)]);
    await expect(svc.restoreFromBuffer(notSqlite)).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects a file with no recognizable SQL content when the engine is mysql", async () => {
    const svc = makeService("mysql");
    const junk = Buffer.alloc(200, "x");
    await expect(svc.restoreFromBuffer(junk)).rejects.toBeInstanceOf(BadRequestException);
  });
});

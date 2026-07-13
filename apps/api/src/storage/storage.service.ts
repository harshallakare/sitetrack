import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface UploadedFileLike {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

/**
 * Local-disk implementation for Phase 1. Swapping to S3-compatible storage
 * later is a config/implementation change behind this same interface, not a
 * rewrite of calling code (see plan doc, Attachment model notes).
 */
@Injectable()
export class StorageService {
  private readonly uploadsDir: string;

  constructor(config: ConfigService) {
    this.uploadsDir = resolve(process.cwd(), config.get<string>("UPLOADS_DIR") ?? "./uploads");
  }

  async save(file: UploadedFileLike): Promise<{ storagePath: string }> {
    await mkdir(this.uploadsDir, { recursive: true });
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${randomUUID()}-${safeName}`;
    await writeFile(join(this.uploadsDir, storagePath), file.buffer);
    return { storagePath };
  }

  getAbsolutePath(storagePath: string): string {
    return join(this.uploadsDir, storagePath);
  }
}

import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.db.tag.findMany({ orderBy: { name: "asc" } });
  }

  /**
   * Resolves a list of tag names to ids, creating any that don't yet exist
   * for the current org. Uses only top-level prisma.db calls (find then
   * create) rather than a nested write or upsert-by-compound-key, so it
   * stays correct regardless of how join rows are wired up by callers.
   */
  async resolveTagIds(names: string[] = []): Promise<string[]> {
    const trimmed = Array.from(new Set(names.map((n) => n.trim()).filter(Boolean)));
    const ids: string[] = [];
    for (const name of trimmed) {
      // eslint-disable-next-line no-await-in-loop
      const existing = await this.prisma.db.tag.findFirst({ where: { name } });
      // eslint-disable-next-line no-await-in-loop
      const tag =
        existing ??
        (await this.prisma.db.tag.create({ data: { name, organizationId: this.prisma.organizationId } }));
      ids.push(tag.id);
    }
    return ids;
  }
}

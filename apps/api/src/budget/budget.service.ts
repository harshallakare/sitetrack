import { Injectable, NotFoundException } from "@nestjs/common";
import { toMinorUnits } from "@sitetrack/shared-types";
import { isUniqueConstraintError } from "../common/prisma-errors";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class BudgetService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Budget vs actual for a site. Planned comes from BudgetLine; actual is the
   * sum of delivery line-item totals for that site grouped by the item's
   * category. Categories that have spend but no budget line still show up
   * (planned 0), so unplanned spend is visible rather than hidden.
   */
  async siteBudget(siteId: string) {
    const site = await this.prisma.db.site.findUnique({ where: { id: siteId } });
    if (!site) throw new NotFoundException("Site not found");

    const [budgetLines, lineItems] = await Promise.all([
      this.prisma.db.budgetLine.findMany({ where: { siteId }, orderBy: { category: "asc" } }),
      // All line items delivered to this site, with their item's category.
      this.prisma.db.deliveryLineItem.findMany({
        where: { delivery: { siteId } },
        select: { lineTotalMinor: true, item: { select: { category: true } } },
      }),
    ]);

    const actualByCategory = new Map<string, number>();
    for (const li of lineItems) {
      const cat = li.item.category?.trim() || "Uncategorized";
      actualByCategory.set(cat, (actualByCategory.get(cat) ?? 0) + li.lineTotalMinor);
    }

    const plannedByCategory = new Map(budgetLines.map((b) => [b.category, b]));

    // Union of budgeted + actually-spent categories.
    const categories = new Set<string>([...plannedByCategory.keys(), ...actualByCategory.keys()]);

    const rows = [...categories]
      .map((category) => {
        const line = plannedByCategory.get(category);
        const plannedMinor = line?.plannedAmountMinor ?? 0;
        const actualMinor = actualByCategory.get(category) ?? 0;
        return {
          id: line?.id ?? null,
          category,
          plannedMinor,
          actualMinor,
          varianceMinor: plannedMinor - actualMinor, // negative = over budget
          budgeted: !!line,
        };
      })
      .sort((a, b) => a.category.localeCompare(b.category));

    const totalPlannedMinor = rows.reduce((s, r) => s + r.plannedMinor, 0);
    const totalActualMinor = rows.reduce((s, r) => s + r.actualMinor, 0);

    return {
      site: { id: site.id, name: site.name },
      totalPlannedMinor,
      totalActualMinor,
      totalVarianceMinor: totalPlannedMinor - totalActualMinor,
      rows,
    };
  }

  async upsertBudgetLine(siteId: string, category: string, plannedAmount: number) {
    const site = await this.prisma.db.site.findUnique({ where: { id: siteId } });
    if (!site) throw new NotFoundException("Site not found");

    const organizationId = this.prisma.organizationId;
    const plannedAmountMinor = toMinorUnits(plannedAmount);

    // Compound-unique upsert isn't supported by the tenant-scoping layer's
    // single-row path, so do the find-then-write explicitly. A concurrent
    // duplicate trips the unique constraint -- retry as an update instead of
    // surfacing a 500.
    const existing = await this.prisma.db.budgetLine.findFirst({ where: { siteId, category } });
    if (existing) {
      return this.prisma.db.budgetLine.update({ where: { id: existing.id }, data: { plannedAmountMinor } });
    }
    try {
      return await this.prisma.db.budgetLine.create({
        data: { organizationId, siteId, category, plannedAmountMinor },
      });
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        const winner = await this.prisma.db.budgetLine.findFirst({ where: { siteId, category } });
        if (winner) {
          return this.prisma.db.budgetLine.update({ where: { id: winner.id }, data: { plannedAmountMinor } });
        }
      }
      throw err;
    }
  }

  async deleteBudgetLine(id: string) {
    return this.prisma.db.budgetLine.delete({ where: { id } });
  }
}

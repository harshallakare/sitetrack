import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface CostAnalyticsFilters {
  tagIds?: string[];
  dateFrom?: string;
  dateTo?: string;
  minAmountMinor?: number;
  maxAmountMinor?: number;
}

const EMPTY_RESULT = {
  totalAmountMinor: 0,
  totalDeliveries: 0,
  lineItemCount: 0,
  byItem: [] as Array<{ itemId: string; itemName: string; totalMinor: number; quantity: number }>,
  byCategory: [] as Array<{ category: string; totalMinor: number }>,
};

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Aggregates delivery line-item spend by tag/date/amount filters. Tag
   * filtering goes through ItemTag (items carry tags, not line items
   * directly) -- resolve the matching item ids first, then filter line
   * items by that set.
   */
  async getCostAnalytics(filters: CostAnalyticsFilters) {
    let itemIdFilter: string[] | undefined;
    if (filters.tagIds && filters.tagIds.length > 0) {
      const itemTags = await this.prisma.db.itemTag.findMany({
        where: { tagId: { in: filters.tagIds } },
        select: { itemId: true },
      });
      itemIdFilter = [...new Set(itemTags.map((it) => it.itemId))];
      if (itemIdFilter.length === 0) return EMPTY_RESULT;
    }

    const deliveryDateFilter: Record<string, Date> = {};
    if (filters.dateFrom) deliveryDateFilter.gte = new Date(filters.dateFrom);
    if (filters.dateTo) deliveryDateFilter.lte = new Date(filters.dateTo);

    const amountFilter: Record<string, number> = {};
    if (filters.minAmountMinor !== undefined) amountFilter.gte = filters.minAmountMinor;
    if (filters.maxAmountMinor !== undefined) amountFilter.lte = filters.maxAmountMinor;

    const lineItems = await this.prisma.db.deliveryLineItem.findMany({
      where: {
        ...(itemIdFilter ? { itemId: { in: itemIdFilter } } : {}),
        ...(Object.keys(amountFilter).length ? { lineTotalMinor: amountFilter } : {}),
        ...(Object.keys(deliveryDateFilter).length ? { delivery: { deliveryDate: deliveryDateFilter } } : {}),
      },
      include: { item: true },
    });

    if (lineItems.length === 0) return EMPTY_RESULT;

    const totalAmountMinor = lineItems.reduce((sum, li) => sum + li.lineTotalMinor, 0);
    const totalDeliveries = new Set(lineItems.map((li) => li.deliveryId)).size;

    const byItemMap = new Map<string, { itemName: string; totalMinor: number; quantity: number }>();
    const byCategoryMap = new Map<string, number>();
    for (const li of lineItems) {
      const existing = byItemMap.get(li.itemId) ?? { itemName: li.item.name, totalMinor: 0, quantity: 0 };
      existing.totalMinor += li.lineTotalMinor;
      existing.quantity += li.quantity;
      byItemMap.set(li.itemId, existing);

      const category = li.item.category ?? "Uncategorized";
      byCategoryMap.set(category, (byCategoryMap.get(category) ?? 0) + li.lineTotalMinor);
    }

    const byItem = [...byItemMap.entries()]
      .map(([itemId, v]) => ({ itemId, ...v }))
      .sort((a, b) => b.totalMinor - a.totalMinor)
      .slice(0, 10);
    const byCategory = [...byCategoryMap.entries()]
      .map(([category, totalMinor]) => ({ category, totalMinor }))
      .sort((a, b) => b.totalMinor - a.totalMinor);

    return { totalAmountMinor, totalDeliveries, lineItemCount: lineItems.length, byItem, byCategory };
  }
}

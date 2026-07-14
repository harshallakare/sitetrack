import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationDispatchService } from "../notifications/notification-dispatch.service";
import { getOwnerEmails } from "../notifications/org-recipients";

interface DeliveryLineItemForCheck {
  itemId: string;
  quantity: number;
  unitPriceMinor: number;
}

/**
 * Fires a "budget exceeded" email the moment a delivery's spend pushes a
 * budgeted category over its planned amount for a site -- not on every
 * delivery after that, only the one that crosses the line. Called from
 * DeliveriesService.create() after the delivery already committed.
 */
@Injectable()
export class BudgetAlertService {
  private readonly logger = new Logger(BudgetAlertService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationDispatchService
  ) {}

  /** Never throws -- a notification failure must not affect the delivery that already committed. */
  async checkCrossedThresholds(params: {
    organizationId: string;
    siteId: string;
    lineItems: DeliveryLineItemForCheck[];
  }) {
    try {
      await this.run(params);
    } catch (err) {
      this.logger.error("Budget alert check failed", err);
    }
  }

  private async run(params: { organizationId: string; siteId: string; lineItems: DeliveryLineItemForCheck[] }) {
    const itemIds = [...new Set(params.lineItems.map((li) => li.itemId))];
    const items = await this.prisma.db.item.findMany({
      where: { id: { in: itemIds } },
      select: { id: true, category: true },
    });
    const categoryByItem = new Map(items.map((i) => [i.id, i.category?.trim() || "Uncategorized"]));

    const deltaByCategory = new Map<string, number>();
    for (const li of params.lineItems) {
      const category = categoryByItem.get(li.itemId) ?? "Uncategorized";
      const total = Math.round(li.quantity * li.unitPriceMinor);
      deltaByCategory.set(category, (deltaByCategory.get(category) ?? 0) + total);
    }

    const touchedCategories = [...deltaByCategory.keys()];
    const budgetLines = await this.prisma.db.budgetLine.findMany({
      where: { siteId: params.siteId, category: { in: touchedCategories } },
    });
    if (budgetLines.length === 0) return;

    // Same aggregation approach as BudgetService.siteBudget(): fetch this
    // site's line items (with the item's category) and sum client-side --
    // there's no cross-engine-safe way to group by a joined field in Prisma.
    const allLineItems = await this.prisma.db.deliveryLineItem.findMany({
      where: { delivery: { siteId: params.siteId }, item: { category: { in: touchedCategories } } },
      select: { lineTotalMinor: true, item: { select: { category: true } } },
    });
    const actualByCategory = new Map<string, number>();
    for (const li of allLineItems) {
      const cat = li.item.category?.trim() || "Uncategorized";
      actualByCategory.set(cat, (actualByCategory.get(cat) ?? 0) + li.lineTotalMinor);
    }

    const site = await this.prisma.db.site.findUnique({ where: { id: params.siteId }, select: { name: true } });
    if (!site) return;

    for (const line of budgetLines) {
      const delta = deltaByCategory.get(line.category) ?? 0;
      if (delta <= 0) continue;

      const actualMinor = actualByCategory.get(line.category) ?? 0;
      const beforeMinor = actualMinor - delta;

      // Only the delivery that pushes actual past planned fires this --
      // an already-over category stays silent on later deliveries.
      if (beforeMinor <= line.plannedAmountMinor && actualMinor > line.plannedAmountMinor) {
        await this.notifyOwners(params.organizationId, site.name, line.category, line.plannedAmountMinor, actualMinor);
      }
    }
  }

  private async notifyOwners(
    organizationId: string,
    siteName: string,
    category: string,
    plannedMinor: number,
    actualMinor: number
  ) {
    const organization = await this.prisma.unscoped.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    });
    const emails = await getOwnerEmails(this.prisma, organizationId);

    for (const email of emails) {
      await this.notifications.dispatch({
        recipient: email,
        organizationId,
        template: {
          name: "budget_exceeded",
          data: { organizationName: organization?.name ?? "Your organization", siteName, category, plannedMinor, actualMinor },
        },
      });
    }
  }
}

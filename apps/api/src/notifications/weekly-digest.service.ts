import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationDispatchService } from "./notification-dispatch.service";
import { getOwnerEmails } from "./org-recipients";

/**
 * Weekly email to each active org's owner(s): deliveries recorded, spend,
 * outstanding vendor balances, and any site currently over its category
 * budgets. Runs in-process via @nestjs/schedule -- no separate worker/queue,
 * which is enough for one api instance (the deployment default; see
 * docker-compose.prod.yml).
 */
@Injectable()
export class WeeklyDigestService {
  private readonly logger = new Logger(WeeklyDigestService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationDispatchService
  ) {}

  // Monday 08:00 server time -- a predictable start-of-week summary rather
  // than something that could land in the middle of the night.
  @Cron("0 8 * * 1")
  async sendWeeklyDigests() {
    const organizations = await this.prisma.unscoped.organization.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    });

    for (const org of organizations) {
      try {
        await this.sendForOrganization(org.id, org.name);
      } catch (err) {
        this.logger.error(`Weekly digest failed for org ${org.id}`, err);
      }
    }
  }

  private async sendForOrganization(organizationId: string, organizationName: string) {
    const emails = await getOwnerEmails(this.prisma, organizationId);
    if (emails.length === 0) return;

    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [deliveries, sites, deliveredTotal, paidTotal] = await Promise.all([
      this.prisma.unscoped.delivery.findMany({
        where: { organizationId, deliveryDate: { gte: since } },
        select: { id: true, lineItems: { select: { lineTotalMinor: true } } },
      }),
      this.prisma.unscoped.site.findMany({ where: { organizationId }, select: { id: true, name: true } }),
      this.prisma.unscoped.deliveryLineItem.aggregate({ where: { organizationId }, _sum: { lineTotalMinor: true } }),
      this.prisma.unscoped.payment.aggregate({ where: { organizationId }, _sum: { amountMinor: true } }),
    ]);

    const deliveriesCount = deliveries.length;
    const spendMinor = deliveries.reduce(
      (sum, d) => sum + d.lineItems.reduce((s, li) => s + li.lineTotalMinor, 0),
      0
    );
    // Outstanding payables, org-wide: total delivered value minus total paid
    // (same definition as the vendor ledger's payables view, just summed
    // across all vendors rather than per-vendor).
    const outstandingPayablesMinor = Math.max(
      0,
      (deliveredTotal._sum.lineTotalMinor ?? 0) - (paidTotal._sum.amountMinor ?? 0)
    );

    const sitesOverBudget = await this.findSitesOverBudget(sites);

    for (const email of emails) {
      await this.notifications.dispatch({
        recipient: email,
        organizationId,
        template: {
          name: "weekly_digest",
          data: { organizationName, deliveriesCount, spendMinor, outstandingPayablesMinor, sitesOverBudget },
        },
      });
    }
  }

  /** Same category-vs-planned comparison as BudgetService.siteBudget(), reused across a site list. */
  private async findSitesOverBudget(sites: { id: string; name: string }[]): Promise<string[]> {
    const overBudget: string[] = [];

    for (const site of sites) {
      const [budgetLines, lineItems] = await Promise.all([
        this.prisma.unscoped.budgetLine.findMany({ where: { siteId: site.id } }),
        this.prisma.unscoped.deliveryLineItem.findMany({
          where: { delivery: { siteId: site.id } },
          select: { lineTotalMinor: true, item: { select: { category: true } } },
        }),
      ]);
      if (budgetLines.length === 0) continue;

      const actualByCategory = new Map<string, number>();
      for (const li of lineItems) {
        const cat = li.item.category?.trim() || "Uncategorized";
        actualByCategory.set(cat, (actualByCategory.get(cat) ?? 0) + li.lineTotalMinor);
      }

      const isOverBudget = budgetLines.some(
        (line) => (actualByCategory.get(line.category) ?? 0) > line.plannedAmountMinor
      );
      if (isOverBudget) overBudget.push(site.name);
    }

    return overBudget;
  }
}

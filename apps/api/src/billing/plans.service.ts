import { ForbiddenException, Injectable, Logger, NotFoundException, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

const DEFAULT_PLANS = [
  { slug: "free", name: "Free", maxSites: 1, priceMonthlyMinor: 0 },
  { slug: "pro", name: "Pro", maxSites: 10, priceMonthlyMinor: 99900 },
  { slug: "enterprise", name: "Enterprise", maxSites: -1, priceMonthlyMinor: 499900 },
];

@Injectable()
export class PlansService implements OnModuleInit {
  private readonly logger = new Logger(PlansService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Seed default plans if missing. `update: {}` is deliberate: once a plan
   * row exists, later edits to DEFAULT_PLANS above do NOT overwrite it --
   * live pricing belongs to the database, and a code deploy silently
   * repricing existing customers would be worse than a stale constant. To
   * change live pricing, update the Plan rows directly (or build an admin
   * plan editor; today's admin UI only assigns plans to orgs).
   */
  async onModuleInit() {
    for (const plan of DEFAULT_PLANS) {
      await this.prisma.unscoped.plan
        .upsert({ where: { slug: plan.slug }, update: {}, create: plan })
        .catch((err) => this.logger.error(`Failed to ensure plan ${plan.slug}`, err));
    }
  }

  listPlans() {
    return this.prisma.unscoped.plan.findMany({ where: { isActive: true }, orderBy: { priceMonthlyMinor: "asc" } });
  }

  /** Effective plan for an org -- its subscription's plan, or the Free default. */
  async planForOrganization(organizationId: string) {
    const sub = await this.prisma.unscoped.subscription.findUnique({
      where: { organizationId },
      include: { plan: true },
    });
    if (sub?.plan) return sub.plan;
    const free = await this.prisma.unscoped.plan.findUnique({ where: { slug: "free" } });
    if (!free) throw new NotFoundException("No free plan configured");
    return free;
  }

  /**
   * Enforced before a site is created. Throws if the org is at its plan's
   * site limit. This is the "one project free" gate.
   */
  async assertCanCreateSite(organizationId: string) {
    const plan = await this.planForOrganization(organizationId);
    if (plan.maxSites === -1) return; // unlimited
    const siteCount = await this.prisma.unscoped.site.count({ where: { organizationId } });
    if (siteCount >= plan.maxSites) {
      throw new ForbiddenException(
        `Your ${plan.name} plan allows ${plan.maxSites} site${plan.maxSites === 1 ? "" : "s"}. Upgrade to add more.`
      );
    }
  }

  /** Billing summary for the customer panel: current plan, usage, options. */
  async billingSummary(organizationId: string) {
    const [plan, siteCount, plans] = await Promise.all([
      this.planForOrganization(organizationId),
      this.prisma.unscoped.site.count({ where: { organizationId } }),
      this.listPlans(),
    ]);
    return {
      currentPlan: plan,
      usage: { sites: siteCount, maxSites: plan.maxSites },
      availablePlans: plans,
    };
  }

  /** Admin: assign a plan to an org (upgrade/downgrade). */
  async setOrganizationPlan(organizationId: string, planSlug: string) {
    const plan = await this.prisma.unscoped.plan.findUnique({ where: { slug: planSlug } });
    if (!plan) throw new NotFoundException("Plan not found");
    await this.prisma.unscoped.subscription.upsert({
      where: { organizationId },
      update: { planId: plan.id, status: "ACTIVE" },
      create: { organizationId, planId: plan.id, status: "ACTIVE" },
    });
    return this.planForOrganization(organizationId);
  }
}

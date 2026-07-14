import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException, OnModuleInit } from "@nestjs/common";
import type { CheckoutSessionResult, VerifyCheckoutInput } from "@sitetrack/shared-types";
import { PrismaService } from "../prisma/prisma.service";
import { writeAuditLog } from "../common/audit/write-audit-log";
import { RazorpayService } from "./razorpay.service";

const DEFAULT_PLANS = [
  { slug: "free", name: "Free", maxSites: 1, priceMonthlyMinor: 0 },
  { slug: "unlimited", name: "Unlimited", maxSites: -1, priceMonthlyMinor: 99900 },
];

// Slugs from an earlier pricing pass -- deactivated (not deleted, in case a
// Subscription still references one) rather than repriced into the new
// two-tier Free/Unlimited lineup.
const LEGACY_PLAN_SLUGS = ["pro", "enterprise"];

// A subscription only grants its plan's limits while genuinely active --
// see RazorpayService/handleWebhookEvent for what moves status between these.
const ACTIVE_SUBSCRIPTION_STATUS = "ACTIVE";

@Injectable()
export class PlansService implements OnModuleInit {
  private readonly logger = new Logger(PlansService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly razorpay: RazorpayService
  ) {}

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
    await this.prisma.unscoped.plan
      .updateMany({ where: { slug: { in: LEGACY_PLAN_SLUGS } }, data: { isActive: false } })
      .catch((err) => this.logger.error("Failed to deactivate legacy plans", err));
  }

  listPlans() {
    return this.prisma.unscoped.plan.findMany({ where: { isActive: true }, orderBy: { priceMonthlyMinor: "asc" } });
  }

  /**
   * Effective plan for an org: its subscription's plan while genuinely
   * ACTIVE, otherwise the Free default. A subscription that's PENDING
   * (checkout started, not yet authorized), PAST_DUE, HALTED, or CANCELLED
   * must NOT grant its plan's limits -- this is what actually enforces the
   * paywall once a payment lapses, not just at signup.
   */
  async planForOrganization(organizationId: string) {
    const sub = await this.prisma.unscoped.subscription.findUnique({
      where: { organizationId },
      include: { plan: true },
    });
    if (sub?.plan && sub.status === ACTIVE_SUBSCRIPTION_STATUS) return sub.plan;
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

  /** Billing summary for the customer panel: current plan, usage, options, subscription state. */
  async billingSummary(organizationId: string) {
    const [plan, siteCount, plans, subscription] = await Promise.all([
      this.planForOrganization(organizationId),
      this.prisma.unscoped.site.count({ where: { organizationId } }),
      this.listPlans(),
      this.prisma.unscoped.subscription.findUnique({ where: { organizationId } }),
    ]);
    return {
      currentPlan: plan,
      usage: { sites: siteCount, maxSites: plan.maxSites },
      availablePlans: plans,
      subscription: subscription
        ? {
            status: subscription.status,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
          }
        : null,
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

  /**
   * Self-serve checkout, step 1: starts (or resumes) a Razorpay subscription
   * for the org against the Unlimited plan. Returns what the frontend needs
   * to open Razorpay's checkout modal; the subscription only becomes ACTIVE
   * once verifyCheckoutPayment confirms the signed callback.
   */
  async createCheckoutSubscription(organizationId: string): Promise<CheckoutSessionResult> {
    const plan = await this.prisma.unscoped.plan.findUnique({ where: { slug: "unlimited" } });
    if (!plan || !plan.isActive) throw new NotFoundException("Unlimited plan is not configured");

    const creds = await this.razorpay.activeCredentials();

    // Reuse an in-flight (not yet authorized) subscription for this exact
    // plan instead of creating a new Razorpay subscription on every click of
    // "Upgrade" (e.g. the customer closed the checkout modal and reopened it).
    const existing = await this.prisma.unscoped.subscription.findUnique({ where: { organizationId } });
    if (existing?.providerSubscriptionId && existing.status === "PENDING" && existing.planId === plan.id) {
      return { provider: "RAZORPAY", keyId: creds.keyId, subscriptionId: existing.providerSubscriptionId };
    }

    const providerPlanId = await this.razorpay.ensureProviderPlan(plan, creds);
    const razorpaySubscription = await this.razorpay.createSubscription(providerPlanId, organizationId, creds);

    await this.prisma.unscoped.subscription.upsert({
      where: { organizationId },
      update: { planId: plan.id, status: "PENDING", providerSubscriptionId: razorpaySubscription.id },
      create: { organizationId, planId: plan.id, status: "PENDING", providerSubscriptionId: razorpaySubscription.id },
    });

    return { provider: "RAZORPAY", keyId: creds.keyId, subscriptionId: razorpaySubscription.id };
  }

  /**
   * Self-serve checkout, step 2: verifies the signed response Razorpay's
   * checkout modal hands back after the customer authorizes payment, and
   * only then flips the subscription to ACTIVE (the actual paywall unlock).
   */
  async verifyCheckoutPayment(organizationId: string, actorUserId: string, input: VerifyCheckoutInput) {
    const subscription = await this.prisma.unscoped.subscription.findUnique({ where: { organizationId } });
    if (!subscription || subscription.providerSubscriptionId !== input.razorpaySubscriptionId) {
      throw new BadRequestException("This checkout session does not match your organization's subscription");
    }

    const creds = await this.razorpay.activeCredentials();
    const validSignature = this.razorpay.verifyCheckoutSignature(
      {
        paymentId: input.razorpayPaymentId,
        subscriptionId: input.razorpaySubscriptionId,
        signature: input.razorpaySignature,
      },
      creds
    );
    if (!validSignature) throw new BadRequestException("Invalid payment signature");

    await this.prisma.db.$transaction(async (tx) => {
      await tx.subscription.update({ where: { organizationId }, data: { status: "ACTIVE" } });
      await writeAuditLog(tx, {
        organizationId,
        entityType: "Subscription",
        entityId: subscription.id,
        action: "UPDATE",
        actorUserId,
        before: { status: subscription.status },
        after: { status: "ACTIVE" },
      });
    });

    return this.billingSummary(organizationId);
  }

  /**
   * Self-serve cancellation: schedules the subscription to end at the
   * current cycle's close rather than revoking access immediately (the
   * customer already paid for this cycle). The org stays on the Unlimited
   * plan's limits until Razorpay's `subscription.cancelled` webhook actually
   * lands at cycle end and flips status to CANCELLED.
   */
  async cancelSubscription(organizationId: string, actorUserId: string) {
    const subscription = await this.prisma.unscoped.subscription.findUnique({ where: { organizationId } });
    if (!subscription || subscription.status !== ACTIVE_SUBSCRIPTION_STATUS || !subscription.providerSubscriptionId) {
      throw new BadRequestException("There's no active subscription to cancel");
    }
    if (subscription.cancelAtPeriodEnd) {
      throw new BadRequestException("Cancellation is already scheduled for the end of the current billing period");
    }

    const creds = await this.razorpay.activeCredentials();
    await this.razorpay.cancelSubscription(subscription.providerSubscriptionId, creds);

    await this.prisma.db.$transaction(async (tx) => {
      await tx.subscription.update({ where: { organizationId }, data: { cancelAtPeriodEnd: true } });
      await writeAuditLog(tx, {
        organizationId,
        entityType: "Subscription",
        entityId: subscription.id,
        action: "UPDATE",
        actorUserId,
        before: { status: subscription.status, cancelAtPeriodEnd: false },
        after: { status: subscription.status, cancelAtPeriodEnd: true },
      });
    });

    return this.billingSummary(organizationId);
  }

  /**
   * Billing history for the customer panel: every recorded status/
   * cancellation transition for this org's subscription, newest first.
   * Reads AuditLog directly (rather than the generic /activity endpoint)
   * because the generic list doesn't surface before/after state, which is
   * exactly what a billing history needs to be legible.
   */
  async billingHistory(organizationId: string, limit = 20) {
    const logs = await this.prisma.db.auditLog.findMany({
      where: { entityType: "Subscription" },
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 100),
    });
    return logs.map((log) => {
      const after = log.afterJson ? (JSON.parse(log.afterJson) as Record<string, unknown>) : {};
      return {
        id: log.id,
        createdAt: log.createdAt.toISOString(),
        status: (after.status as string | undefined) ?? null,
        cancelAtPeriodEnd: (after.cancelAtPeriodEnd as boolean | undefined) ?? null,
        viaWebhookEvent: (after.viaWebhookEvent as string | undefined) ?? null,
      };
    });
  }

  /**
   * Applies a Razorpay subscription webhook event. Renewals
   * ("subscription.charged") keep the org ACTIVE; failures/cancellation
   * demote it, which drops the org back to the Free plan's limits on its
   * next request via planForOrganization -- this is what makes the paywall
   * hold even if a customer's card starts failing after the first charge.
   */
  async handleRazorpayWebhookEvent(event: { event: string; payload?: { subscription?: { entity?: RazorpaySubscriptionEntity } } }) {
    const entity = event.payload?.subscription?.entity;
    if (!entity?.id) return;

    const subscription = await this.prisma.unscoped.subscription.findUnique({
      where: { providerSubscriptionId: entity.id },
    });
    if (!subscription) return; // Not one of ours (or a stale/duplicate event) -- ack and ignore.

    const nextStatus = STATUS_BY_WEBHOOK_EVENT[event.event];
    if (!nextStatus) return; // Event we don't act on (e.g. subscription.updated) -- ack and ignore.

    // No CLS tenant context exists here -- this handler runs from a public,
    // unauthenticated webhook route, not a per-org request. `.unscoped` is
    // correct and safe: both the where-clause (by providerSubscriptionId,
    // already resolved to a specific organizationId above) and the audit
    // row's organizationId are supplied explicitly, not inferred from a
    // request that doesn't exist.
    // Once the subscription actually ends, "cancellation scheduled" is no
    // longer meaningful state -- it's just cancelled now.
    const clearsCancelFlag = nextStatus === "CANCELLED";

    await this.prisma.unscoped.$transaction(async (tx) => {
      await tx.subscription.update({
        where: { providerSubscriptionId: entity.id },
        data: {
          status: nextStatus,
          ...(clearsCancelFlag ? { cancelAtPeriodEnd: false } : {}),
          ...(entity.current_end ? { currentPeriodEnd: new Date(entity.current_end * 1000) } : {}),
        },
      });
      await writeAuditLog(tx, {
        organizationId: subscription.organizationId,
        entityType: "Subscription",
        entityId: subscription.id,
        action: "UPDATE",
        actorUserId: null,
        before: { status: subscription.status, cancelAtPeriodEnd: subscription.cancelAtPeriodEnd },
        after: {
          status: nextStatus,
          viaWebhookEvent: event.event,
          ...(clearsCancelFlag ? { cancelAtPeriodEnd: false } : {}),
        },
      });
    });
  }
}

interface RazorpaySubscriptionEntity {
  id: string;
  current_end?: number | null;
}

const STATUS_BY_WEBHOOK_EVENT: Record<string, string> = {
  "subscription.activated": "ACTIVE",
  "subscription.charged": "ACTIVE",
  "subscription.pending": "PAST_DUE",
  "subscription.halted": "HALTED",
  "subscription.cancelled": "CANCELLED",
  "subscription.completed": "CANCELLED",
};

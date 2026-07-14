import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { PlansService } from "./plans.service";
import { toMinorUnits, fromMinorUnits } from "@sitetrack/shared-types";

/**
 * assertCanCreateSite is the core "one project free" gate. We drive it with a
 * fake PrismaService so the limit logic is tested without a DB.
 */
function makePrisma(plan: { name: string; maxSites: number }, siteCount: number) {
  return {
    unscoped: {
      // status: "ACTIVE" matters -- planForOrganization only honors a
      // subscription's plan while genuinely active (see its docstring).
      subscription: { findUnique: async () => ({ plan, status: "ACTIVE" }) },
      plan: { findUnique: async () => plan },
      site: { count: async () => siteCount },
    },
  } as any;
}

// assertCanCreateSite never touches RazorpayService, so a dummy stands in.
const fakeRazorpay = {} as any;

describe("PlansService.assertCanCreateSite", () => {
  it("blocks creating a site at the plan limit", async () => {
    const svc = new PlansService(makePrisma({ name: "Free", maxSites: 1 }, 1), fakeRazorpay);
    await expect(svc.assertCanCreateSite("org1")).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("allows creating a site below the limit", async () => {
    const svc = new PlansService(makePrisma({ name: "Unlimited", maxSites: 10 }, 3), fakeRazorpay);
    await expect(svc.assertCanCreateSite("org1")).resolves.toBeUndefined();
  });

  it("allows unlimited (maxSites = -1) regardless of count", async () => {
    const svc = new PlansService(makePrisma({ name: "Unlimited", maxSites: -1 }, 999), fakeRazorpay);
    await expect(svc.assertCanCreateSite("org1")).resolves.toBeUndefined();
  });
});

/**
 * planForOrganization is the actual paywall enforcement point: a
 * subscription must be genuinely ACTIVE to grant its plan's limits.
 * PENDING (checkout started, not yet authorized), PAST_DUE, HALTED, and
 * CANCELLED must all fall back to Free -- this is what makes a lapsed
 * renewal (via the Razorpay webhook) actually take the org's sites away,
 * not just gate signup.
 */
describe("PlansService.planForOrganization", () => {
  const unlimitedPlan = { id: "plan_unlimited", slug: "unlimited", name: "Unlimited", maxSites: -1 };
  const freePlan = { id: "plan_free", slug: "free", name: "Free", maxSites: 1 };

  function makePrismaWithStatus(status: string | null) {
    return {
      unscoped: {
        subscription: {
          findUnique: async () => (status ? { plan: unlimitedPlan, status } : null),
        },
        plan: { findUnique: async () => freePlan },
      },
    } as any;
  }

  it("grants the subscription's plan when status is ACTIVE", async () => {
    const svc = new PlansService(makePrismaWithStatus("ACTIVE"), {} as any);
    await expect(svc.planForOrganization("org1")).resolves.toEqual(unlimitedPlan);
  });

  it.each(["PENDING", "PAST_DUE", "HALTED", "CANCELLED"])(
    "falls back to Free when subscription status is %s",
    async (status) => {
      const svc = new PlansService(makePrismaWithStatus(status), {} as any);
      await expect(svc.planForOrganization("org1")).resolves.toEqual(freePlan);
    }
  );

  it("falls back to Free when there's no subscription at all", async () => {
    const svc = new PlansService(makePrismaWithStatus(null), {} as any);
    await expect(svc.planForOrganization("org1")).resolves.toEqual(freePlan);
  });
});

describe("PlansService.createCheckoutSubscription", () => {
  const unlimitedPlan = { id: "plan_unlimited", slug: "unlimited", name: "Unlimited", isActive: true, priceMonthlyMinor: 99900, providerPlanId: null };
  const creds = { keyId: "rzp_test_key", keySecret: "secret", webhookSecret: null };

  it("reuses an in-flight PENDING subscription instead of creating a new one", async () => {
    const createSubscription = jest.fn();
    let upsertCalls = 0;

    const prisma = {
      unscoped: {
        plan: { findUnique: async () => unlimitedPlan },
        subscription: {
          findUnique: async () => ({
            providerSubscriptionId: "sub_existing",
            status: "PENDING",
            planId: unlimitedPlan.id,
          }),
          upsert: async () => {
            upsertCalls += 1;
          },
        },
      },
    } as any;
    const razorpay = {
      activeCredentials: async () => creds,
      ensureProviderPlan: async () => "rzp_plan_1",
      createSubscription,
    } as any;

    const svc = new PlansService(prisma, razorpay);
    const result = await svc.createCheckoutSubscription("org1");

    expect(result).toEqual({ provider: "RAZORPAY", keyId: creds.keyId, subscriptionId: "sub_existing" });
    expect(createSubscription).not.toHaveBeenCalled();
    expect(upsertCalls).toBe(0);
  });

  it("creates a new subscription when there's no reusable PENDING one", async () => {
    let savedProviderSubscriptionId: string | undefined;

    const prisma = {
      unscoped: {
        plan: { findUnique: async () => unlimitedPlan },
        subscription: {
          findUnique: async () => null,
          upsert: async ({ create }: any) => {
            savedProviderSubscriptionId = create.providerSubscriptionId;
          },
        },
      },
    } as any;
    const razorpay = {
      activeCredentials: async () => creds,
      ensureProviderPlan: async () => "rzp_plan_1",
      createSubscription: async () => ({ id: "sub_new" }),
    } as any;

    const svc = new PlansService(prisma, razorpay);
    const result = await svc.createCheckoutSubscription("org1");

    expect(result).toEqual({ provider: "RAZORPAY", keyId: creds.keyId, subscriptionId: "sub_new" });
    expect(savedProviderSubscriptionId).toBe("sub_new");
  });
});

describe("PlansService.verifyCheckoutPayment", () => {
  it("rejects when the subscription id doesn't match what's on file (session substitution)", async () => {
    const prisma = {
      unscoped: {
        subscription: { findUnique: async () => ({ id: "sub_row", providerSubscriptionId: "sub_real", status: "PENDING" }) },
      },
    } as any;
    const razorpay = { activeCredentials: async () => ({ keyId: "k", keySecret: "s", webhookSecret: null }) } as any;

    const svc = new PlansService(prisma, razorpay);
    await expect(
      svc.verifyCheckoutPayment("org1", "user1", {
        razorpayPaymentId: "pay_1",
        razorpaySubscriptionId: "sub_attacker_controlled",
        razorpaySignature: "sig",
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects an invalid signature and does not activate the subscription", async () => {
    const prisma = {
      unscoped: {
        subscription: { findUnique: async () => ({ id: "sub_row", providerSubscriptionId: "sub_real", status: "PENDING" }) },
      },
    } as any;
    const razorpay = {
      activeCredentials: async () => ({ keyId: "k", keySecret: "s", webhookSecret: null }),
      verifyCheckoutSignature: () => false,
    } as any;

    const svc = new PlansService(prisma, razorpay);
    await expect(
      svc.verifyCheckoutPayment("org1", "user1", {
        razorpayPaymentId: "pay_1",
        razorpaySubscriptionId: "sub_real",
        razorpaySignature: "forged",
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe("PlansService.cancelSubscription", () => {
  function makeTxCapturingPrisma(subscription: { id: string; status: string; cancelAtPeriodEnd: boolean; providerSubscriptionId: string | null }) {
    const updates: any[] = [];
    const auditLogs: any[] = [];
    return {
      prisma: {
        unscoped: { subscription: { findUnique: async () => subscription } },
        db: {
          $transaction: async (fn: any) =>
            fn({
              subscription: { update: async (args: any) => updates.push(args) },
              auditLog: { create: async (args: any) => auditLogs.push(args) },
            }),
        },
      } as any,
      updates,
      auditLogs,
    };
  }

  it("rejects when there's no subscription at all", async () => {
    const prisma = { unscoped: { subscription: { findUnique: async () => null } } } as any;
    const svc = new PlansService(prisma, {} as any);
    await expect(svc.cancelSubscription("org1", "user1")).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects when the subscription isn't ACTIVE (already free/lapsed)", async () => {
    const { prisma } = makeTxCapturingPrisma({
      id: "sub1",
      status: "PAST_DUE",
      cancelAtPeriodEnd: false,
      providerSubscriptionId: "sub_real",
    });
    const svc = new PlansService(prisma, {} as any);
    await expect(svc.cancelSubscription("org1", "user1")).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects a second cancellation request once one is already scheduled", async () => {
    const { prisma } = makeTxCapturingPrisma({
      id: "sub1",
      status: "ACTIVE",
      cancelAtPeriodEnd: true,
      providerSubscriptionId: "sub_real",
    });
    const svc = new PlansService(prisma, {} as any);
    await expect(svc.cancelSubscription("org1", "user1")).rejects.toBeInstanceOf(BadRequestException);
  });

  it("cancels at Razorpay (cycle-end, not immediate) and records cancelAtPeriodEnd", async () => {
    const { prisma, updates, auditLogs } = makeTxCapturingPrisma({
      id: "sub1",
      status: "ACTIVE",
      cancelAtPeriodEnd: false,
      providerSubscriptionId: "sub_real",
    });
    const cancelSubscription = jest.fn(async () => ({}));
    const razorpay = { activeCredentials: async () => ({ keyId: "k", keySecret: "s", webhookSecret: null }), cancelSubscription } as any;

    // billingSummary is called at the end -- stub the pieces it needs.
    prisma.unscoped.plan = { findUnique: async () => ({ id: "plan_free", slug: "free", maxSites: 1 }) };
    prisma.unscoped.site = { count: async () => 0 };

    const svc = new PlansService(prisma, razorpay);
    // Re-stub listPlans dependency minimally by giving plan.findMany too.
    (prisma.unscoped.plan as any).findMany = async () => [];

    await svc.cancelSubscription("org1", "user1");

    expect(cancelSubscription).toHaveBeenCalledWith("sub_real", expect.objectContaining({ keyId: "k" }));
    expect(updates[0]).toEqual({ where: { organizationId: "org1" }, data: { cancelAtPeriodEnd: true } });
    expect(auditLogs[0].data.afterJson).toContain('"cancelAtPeriodEnd":true');
  });
});

describe("PlansService.billingHistory", () => {
  it("parses the after-state JSON into a structured entry", async () => {
    const prisma = {
      db: {
        auditLog: {
          findMany: async () => [
            {
              id: "log1",
              createdAt: new Date("2026-01-05T00:00:00Z"),
              afterJson: JSON.stringify({ status: "ACTIVE", viaWebhookEvent: "subscription.charged" }),
            },
          ],
        },
      },
    } as any;
    const svc = new PlansService(prisma, {} as any);

    const history = await svc.billingHistory("org1");
    expect(history).toEqual([
      {
        id: "log1",
        createdAt: "2026-01-05T00:00:00.000Z",
        status: "ACTIVE",
        cancelAtPeriodEnd: null,
        viaWebhookEvent: "subscription.charged",
      },
    ]);
  });

  it("tolerates a null afterJson rather than throwing", async () => {
    const prisma = {
      db: { auditLog: { findMany: async () => [{ id: "log1", createdAt: new Date(), afterJson: null }] } },
    } as any;
    const svc = new PlansService(prisma, {} as any);

    const history = await svc.billingHistory("org1");
    expect(history[0].status).toBeNull();
  });
});

describe("money helpers", () => {
  it("converts major to minor units and back without drift", () => {
    expect(toMinorUnits(355.5)).toBe(35550);
    expect(fromMinorUnits(35550)).toBe(355.5);
    expect(fromMinorUnits(toMinorUnits(71000))).toBe(71000);
  });

  it("rounds to the nearest paisa", () => {
    expect(toMinorUnits(0.005)).toBe(1);
    expect(toMinorUnits(0.004)).toBe(0);
  });
});

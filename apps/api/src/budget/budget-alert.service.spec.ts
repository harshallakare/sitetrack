import { BudgetAlertService } from "./budget-alert.service";

/**
 * The core rule under test: a category alert fires only on the delivery
 * that pushes actual spend from at-or-under planned to over planned --
 * never on deliveries before that point, and never again on deliveries
 * after it (an already-over category stays silent).
 */
function makeHarness(params: {
  itemCategory: string;
  plannedAmountMinor: number;
  /** Total category spend across ALL deliveries at the site, including this one. */
  actualMinorAfter: number;
  siteName?: string;
}) {
  const dispatched: any[] = [];
  const prisma = {
    db: {
      item: { findMany: async () => [{ id: "item1", category: params.itemCategory }] },
      budgetLine: {
        findMany: async () => [{ category: params.itemCategory, plannedAmountMinor: params.plannedAmountMinor }],
      },
      deliveryLineItem: {
        findMany: async () => [
          { lineTotalMinor: params.actualMinorAfter, item: { category: params.itemCategory } },
        ],
      },
      site: { findUnique: async () => ({ name: params.siteName ?? "Tower A" }) },
    },
    unscoped: {
      organization: { findUnique: async () => ({ name: "Acme" }) },
      membership: { findMany: async () => [{ userId: "user1" }] },
      user: { findMany: async () => [{ email: "owner@acme.test" }] },
    },
  } as any;
  const notifications = { dispatch: async (req: any) => dispatched.push(req) } as any;

  return { svc: new BudgetAlertService(prisma, notifications), dispatched };
}

describe("BudgetAlertService.checkCrossedThresholds", () => {
  it("fires when this delivery pushes a category from under to over its planned budget", async () => {
    const { svc, dispatched } = makeHarness({
      itemCategory: "Cement",
      plannedAmountMinor: 100000,
      actualMinorAfter: 120000, // total after this delivery
    });

    await svc.checkCrossedThresholds({
      organizationId: "org1",
      siteId: "site1",
      lineItems: [{ itemId: "item1", quantity: 1, unitPriceMinor: 30000 }], // this delivery's own contribution
    });

    expect(dispatched).toHaveLength(1);
    expect(dispatched[0].recipient).toBe("owner@acme.test");
    expect(dispatched[0].template.name).toBe("budget_exceeded");
    expect(dispatched[0].template.data.category).toBe("Cement");
  });

  it("does not fire when the category is still under budget after this delivery", async () => {
    const { svc, dispatched } = makeHarness({
      itemCategory: "Cement",
      plannedAmountMinor: 100000,
      actualMinorAfter: 80000,
    });

    await svc.checkCrossedThresholds({
      organizationId: "org1",
      siteId: "site1",
      lineItems: [{ itemId: "item1", quantity: 1, unitPriceMinor: 30000 }],
    });

    expect(dispatched).toHaveLength(0);
  });

  it("does not re-fire when the category was already over budget before this delivery", async () => {
    // actualMinorAfter (200000) minus this delivery's own contribution (30000)
    // leaves 170000 already over the 100000 planned amount -- not a fresh crossing.
    const { svc, dispatched } = makeHarness({
      itemCategory: "Cement",
      plannedAmountMinor: 100000,
      actualMinorAfter: 200000,
    });

    await svc.checkCrossedThresholds({
      organizationId: "org1",
      siteId: "site1",
      lineItems: [{ itemId: "item1", quantity: 1, unitPriceMinor: 30000 }],
    });

    expect(dispatched).toHaveLength(0);
  });

  it("never throws even if a query fails", async () => {
    const prisma = {
      db: {
        item: { findMany: async () => { throw new Error("db down"); } },
      },
    } as any;
    const svc = new BudgetAlertService(prisma, { dispatch: async () => undefined } as any);

    await expect(
      svc.checkCrossedThresholds({ organizationId: "org1", siteId: "site1", lineItems: [{ itemId: "item1", quantity: 1, unitPriceMinor: 100 }] })
    ).resolves.toBeUndefined();
  });
});

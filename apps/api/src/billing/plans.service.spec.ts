import { ForbiddenException } from "@nestjs/common";
import { PlansService } from "./plans.service";
import { toMinorUnits, fromMinorUnits } from "@sitetrack/shared-types";

/**
 * assertCanCreateSite is the core "one project free" gate. We drive it with a
 * fake PrismaService so the limit logic is tested without a DB.
 */
function makePrisma(plan: { name: string; maxSites: number }, siteCount: number) {
  return {
    unscoped: {
      subscription: { findUnique: async () => ({ plan }) },
      plan: { findUnique: async () => plan },
      site: { count: async () => siteCount },
    },
  } as any;
}

describe("PlansService.assertCanCreateSite", () => {
  it("blocks creating a site at the plan limit", async () => {
    const svc = new PlansService(makePrisma({ name: "Free", maxSites: 1 }, 1));
    await expect(svc.assertCanCreateSite("org1")).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("allows creating a site below the limit", async () => {
    const svc = new PlansService(makePrisma({ name: "Pro", maxSites: 10 }, 3));
    await expect(svc.assertCanCreateSite("org1")).resolves.toBeUndefined();
  });

  it("allows unlimited (maxSites = -1) regardless of count", async () => {
    const svc = new PlansService(makePrisma({ name: "Enterprise", maxSites: -1 }, 999));
    await expect(svc.assertCanCreateSite("org1")).resolves.toBeUndefined();
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

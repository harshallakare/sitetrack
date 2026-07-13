import { Reflector } from "@nestjs/core";
import type { ExecutionContext } from "@nestjs/common";
import { RolesGuard } from "./roles.guard";
import type { Role } from "@sitetrack/shared-types";

function contextWith(role: Role | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ tenantContext: role ? { role } : undefined }) }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

function guardRequiring(required: Role[] | undefined) {
  const reflector = { getAllAndOverride: () => required } as unknown as Reflector;
  return new RolesGuard(reflector);
}

describe("RolesGuard", () => {
  it("allows when no roles are required", () => {
    expect(guardRequiring(undefined).canActivate(contextWith("ACCOUNTANT"))).toBe(true);
  });

  it("allows when the user's role is in the required set", () => {
    expect(guardRequiring(["OWNER", "SUPERVISOR"]).canActivate(contextWith("SUPERVISOR"))).toBe(true);
  });

  it("denies when the user's role is not permitted", () => {
    expect(guardRequiring(["OWNER"]).canActivate(contextWith("ACCOUNTANT"))).toBe(false);
  });

  it("denies when there is no tenant context at all", () => {
    expect(guardRequiring(["OWNER"]).canActivate(contextWith(undefined))).toBe(false);
  });
});

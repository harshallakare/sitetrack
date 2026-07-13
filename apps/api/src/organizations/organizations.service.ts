import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { TenantContext } from "../auth/types";

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  /** All organizations the current user belongs to, for the org switcher. */
  listMyOrganizations(currentUser: TenantContext) {
    return this.prisma.unscoped.membership.findMany({
      where: { userId: currentUser.userId, isActive: true },
      include: { organization: true },
      orderBy: { joinedAt: "asc" },
    });
  }

  getCurrentOrganization(currentUser: TenantContext) {
    return this.prisma.unscoped.organization.findUnique({
      where: { id: currentUser.organizationId },
    });
  }

  listMembers(currentUser: TenantContext) {
    return this.prisma.unscoped.membership.findMany({
      where: { organizationId: currentUser.organizationId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { joinedAt: "asc" },
    });
  }
}

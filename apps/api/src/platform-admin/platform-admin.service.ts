import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PlatformAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const [organizationCount, activeOrganizationCount, userCount, siteCount, deliveryCount, payments] =
      await Promise.all([
        this.prisma.unscoped.organization.count(),
        this.prisma.unscoped.organization.count({ where: { isActive: true } }),
        this.prisma.unscoped.user.count(),
        this.prisma.unscoped.site.count(),
        this.prisma.unscoped.delivery.count(),
        this.prisma.unscoped.payment.aggregate({ _sum: { amountMinor: true } }),
      ]);

    return {
      organizationCount,
      activeOrganizationCount,
      suspendedOrganizationCount: organizationCount - activeOrganizationCount,
      userCount,
      siteCount,
      deliveryCount,
      totalPaymentVolumeMinor: payments._sum.amountMinor ?? 0,
    };
  }

  listOrganizations() {
    return this.prisma.unscoped.organization.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { memberships: true, sites: true, vendors: true, deliveries: true } },
        subscription: { include: { plan: { select: { slug: true, name: true, maxSites: true } } } },
      },
    });
  }

  async getOrganization(id: string) {
    const organization = await this.prisma.unscoped.organization.findUnique({
      where: { id },
      include: {
        memberships: {
          include: { user: { select: { id: true, name: true, email: true, isActive: true } } },
          orderBy: { joinedAt: "asc" },
        },
        sites: true,
        _count: { select: { vendors: true, items: true, deliveries: true, payments: true } },
      },
    });
    if (!organization) throw new NotFoundException("Organization not found");
    return organization;
  }

  async setOrganizationActive(id: string, isActive: boolean) {
    const organization = await this.prisma.unscoped.organization.findUnique({ where: { id } });
    if (!organization) throw new NotFoundException("Organization not found");

    return this.prisma.unscoped.organization.update({
      where: { id },
      data: { isActive },
    });
  }

  listUsers() {
    return this.prisma.unscoped.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        isPlatformAdmin: true,
        createdAt: true,
        _count: { select: { memberships: true } },
      },
    });
  }
}

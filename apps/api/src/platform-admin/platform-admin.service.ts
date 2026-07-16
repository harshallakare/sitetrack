import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import argon2 from "argon2";
import type {
  AddOrganizationUserInput,
  CreateOrganizationInput,
  CreatePlatformAdminInput,
  ResetUserPasswordInput,
  UpdateUserInput,
} from "@sitetrack/shared-types";
import { isUniqueConstraintError } from "../common/prisma-errors";
import { slugify } from "../common/slugify";
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

  /**
   * Onboards a brand-new customer directly from the admin panel: creates
   * the organization, its owner account, and a default cash account in one
   * transaction -- the same shape as self-serve /auth/register, minus
   * issuing a session (the admin isn't logging in as this customer). The
   * owner email must be brand new, same rule register() enforces.
   */
  async createOrganization(input: CreateOrganizationInput) {
    const email = input.ownerEmail.toLowerCase().trim();
    const existing = await this.prisma.unscoped.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException("An account with this email already exists");
    }

    const passwordHash = await argon2.hash(input.ownerPassword);
    const baseSlug = slugify(input.organizationName);
    let slug = baseSlug;
    let suffix = 1;
    // eslint-disable-next-line no-await-in-loop
    while (await this.prisma.unscoped.organization.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${++suffix}`;
    }

    try {
      const { organization, user } = await this.prisma.unscoped.$transaction(async (tx) => {
        const organization = await tx.organization.create({
          data: { name: input.organizationName, slug },
        });
        const user = await tx.user.create({
          data: { email, name: input.ownerName, passwordHash },
        });
        await tx.membership.create({
          data: { userId: user.id, organizationId: organization.id, role: "OWNER", joinedAt: new Date() },
        });
        await tx.account.create({
          data: {
            organizationId: organization.id,
            name: "Cash",
            type: "CASH",
            description: "Default cash account for petty expenses and cash transactions",
          },
        });
        return { organization, user };
      });
      return { id: organization.id, name: organization.name, slug: organization.slug, ownerEmail: user.email };
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        throw new ConflictException("An account with this email already exists");
      }
      throw err;
    }
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
        phone: true,
        isActive: true,
        isPlatformAdmin: true,
        createdAt: true,
        _count: { select: { memberships: true } },
      },
    });
  }

  /**
   * Creates another dedicated platform-admin account -- same rule as the
   * create-platform-admin.ts CLI script (which this replaces for day-to-day
   * use): the email must not already belong to any user, customer or admin,
   * so admin credentials never overlap with a customer login.
   */
  async createAdmin(input: CreatePlatformAdminInput) {
    const email = input.email.toLowerCase().trim();
    const existing = await this.prisma.unscoped.user.findUnique({ where: { email } });
    if (existing) {
      throw new BadRequestException(
        "A user with this email already exists. Admin accounts must use a dedicated email, not a customer account."
      );
    }

    const passwordHash = await argon2.hash(input.password);
    const user = await this.prisma.unscoped.user.create({
      data: { email, name: input.name, passwordHash, isPlatformAdmin: true },
      select: { id: true, name: true, email: true, isActive: true, isPlatformAdmin: true, createdAt: true },
    });
    return user;
  }

  /**
   * Adds a person to an organization directly, bypassing the normal invite
   * email/token flow. If the email already belongs to an existing (non-admin)
   * user, name/password are ignored and they just gain a new Membership --
   * same "ignored for an existing account" rule as MembersService.accept().
   * A brand-new email requires both to create the account.
   */
  async addOrganizationUser(organizationId: string, input: AddOrganizationUserInput) {
    const organization = await this.prisma.unscoped.organization.findUnique({ where: { id: organizationId } });
    if (!organization) throw new NotFoundException("Organization not found");

    const email = input.email.toLowerCase().trim();
    let user = await this.prisma.unscoped.user.findUnique({ where: { email } });

    if (user) {
      if (user.isPlatformAdmin) {
        throw new BadRequestException(
          "This email belongs to a platform admin account and cannot be added as an organization member"
        );
      }
      const existingMembership = await this.prisma.unscoped.membership.findUnique({
        where: { userId_organizationId: { userId: user.id, organizationId } },
      });
      if (existingMembership) {
        throw new BadRequestException("This person is already a member of this organization");
      }
    } else {
      if (!input.name || !input.password) {
        throw new BadRequestException("Name and password are required to create a new account");
      }
      const passwordHash = await argon2.hash(input.password);
      user = await this.prisma.unscoped.user.create({ data: { email, name: input.name, passwordHash } });
    }

    await this.prisma.unscoped.membership.create({
      data: { userId: user.id, organizationId, role: input.role, joinedAt: new Date() },
    });

    return { id: user.id, name: user.name, email: user.email };
  }

  /**
   * Admin edits another user's profile fields. Deliberately excludes
   * password and isPlatformAdmin -- those have their own, more careful
   * endpoints (resetUserPassword below; isPlatformAdmin has no update route
   * at all, only createAdmin).
   */
  async updateUser(userId: string, input: UpdateUserInput) {
    const user = await this.prisma.unscoped.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");

    const data: { name?: string; email?: string; phone?: string | null } = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.phone !== undefined) data.phone = input.phone;
    if (input.email !== undefined) {
      const email = input.email.toLowerCase().trim();
      if (email !== user.email) {
        const existing = await this.prisma.unscoped.user.findUnique({ where: { email } });
        if (existing) throw new BadRequestException("A user with this email already exists");
        data.email = email;
      }
    }

    return this.prisma.unscoped.user.update({
      where: { id: userId },
      data,
      select: { id: true, name: true, email: true, phone: true, isActive: true, isPlatformAdmin: true },
    });
  }

  /**
   * Admin-driven password reset: sets a new password directly (the admin is
   * already authenticated, so this skips the emailed-token self-serve flow).
   * Revokes every existing session for the user -- tenant refresh tokens
   * across all their orgs, and admin sessions if they're a platform admin --
   * same as the self-serve reset does, so an old session can't outlive a
   * password change.
   */
  async resetUserPassword(userId: string, input: ResetUserPasswordInput) {
    const user = await this.prisma.unscoped.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");

    const passwordHash = await argon2.hash(input.password);
    const now = new Date();
    await this.prisma.unscoped.$transaction([
      this.prisma.unscoped.user.update({ where: { id: userId }, data: { passwordHash } }),
      this.prisma.unscoped.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: now },
      }),
      this.prisma.unscoped.adminSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: now },
      }),
    ]);

    return { id: user.id, email: user.email };
  }
}

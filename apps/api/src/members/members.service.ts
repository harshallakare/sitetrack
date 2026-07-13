import { randomBytes } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import argon2 from "argon2";
import { ConfigService } from "@nestjs/config";
import type { AcceptInvitationInput, Role } from "@sitetrack/shared-types";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationDispatchService } from "../notifications/notification-dispatch.service";
import type { TenantContext } from "../auth/types";

const INVITE_TTL_DAYS = 14;

@Injectable()
export class MembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationDispatchService,
    private readonly config: ConfigService
  ) {}

  listMembers(currentUser: TenantContext) {
    // Uses unscoped because Membership is queried by organizationId directly
    // here (the tenant-scoping extension covers organizationId-bearing
    // models, but we also want the joined User which is a global entity).
    return this.prisma.unscoped.membership.findMany({
      where: { organizationId: currentUser.organizationId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { joinedAt: "asc" },
    });
  }

  listInvitations(currentUser: TenantContext) {
    return this.prisma.unscoped.invitation.findMany({
      where: { organizationId: currentUser.organizationId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
    });
  }

  async invite(currentUser: TenantContext, email: string, role: Role) {
    const normalizedEmail = email.toLowerCase().trim();

    // If the email already belongs to a member of THIS org, no-op with a
    // clear error rather than creating a dangling invite.
    const existingUser = await this.prisma.unscoped.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      const membership = await this.prisma.unscoped.membership.findUnique({
        where: { userId_organizationId: { userId: existingUser.id, organizationId: currentUser.organizationId } },
      });
      if (membership) {
        throw new ConflictException("That person is already a member of this organization");
      }
    }

    // Reuse a still-pending invite for the same email instead of stacking
    // duplicates -- just refresh its token/expiry/role.
    const token = randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

    const existingInvite = await this.prisma.unscoped.invitation.findFirst({
      where: { organizationId: currentUser.organizationId, email: normalizedEmail, status: "PENDING" },
    });

    const invitation = existingInvite
      ? await this.prisma.unscoped.invitation.update({
          where: { id: existingInvite.id },
          data: { role, token, expiresAt, invitedByUserId: currentUser.userId },
        })
      : await this.prisma.unscoped.invitation.create({
          data: {
            organizationId: currentUser.organizationId,
            email: normalizedEmail,
            role,
            token,
            expiresAt,
            invitedByUserId: currentUser.userId,
          },
        });

    // Best-effort invite email (link is also copyable in the UI, so email
    // failure doesn't block the invite).
    const org = await this.prisma.unscoped.organization.findUnique({
      where: { id: currentUser.organizationId },
      select: { name: true },
    });
    const appBaseUrl = (this.config.get<string>("CORS_ORIGIN") ?? "http://localhost:3000").replace(/\/$/, "");
    await this.notifications.dispatch({
      recipient: normalizedEmail,
      organizationId: currentUser.organizationId,
      template: {
        name: "org_invite",
        data: {
          organizationName: org?.name ?? "an organization",
          role,
          inviteUrl: `${appBaseUrl}/invite/${token}`,
        },
      },
    });

    return invitation;
  }

  async revokeInvitation(currentUser: TenantContext, invitationId: string) {
    const invitation = await this.prisma.unscoped.invitation.findUnique({ where: { id: invitationId } });
    if (!invitation || invitation.organizationId !== currentUser.organizationId) {
      throw new NotFoundException("Invitation not found");
    }
    return this.prisma.unscoped.invitation.update({
      where: { id: invitationId },
      data: { status: "REVOKED" },
    });
  }

  async changeRole(currentUser: TenantContext, membershipId: string, role: Role) {
    const membership = await this.prisma.unscoped.membership.findUnique({ where: { id: membershipId } });
    if (!membership || membership.organizationId !== currentUser.organizationId) {
      throw new NotFoundException("Member not found");
    }
    await this.guardLastOwner(currentUser.organizationId, membership.id, membership.role, role);
    return this.prisma.unscoped.membership.update({ where: { id: membershipId }, data: { role } });
  }

  async removeMember(currentUser: TenantContext, membershipId: string) {
    const membership = await this.prisma.unscoped.membership.findUnique({ where: { id: membershipId } });
    if (!membership || membership.organizationId !== currentUser.organizationId) {
      throw new NotFoundException("Member not found");
    }
    if (membership.userId === currentUser.userId) {
      throw new BadRequestException("You cannot remove yourself from the organization");
    }
    // Removing an owner must not leave the org ownerless.
    await this.guardLastOwner(currentUser.organizationId, membership.id, membership.role, "SUPERVISOR");
    return this.prisma.unscoped.membership.delete({ where: { id: membershipId } });
  }

  // ---- public accept flow (no tenant context) ----

  async getInvitationByToken(token: string) {
    const invitation = await this.prisma.unscoped.invitation.findUnique({
      where: { token },
      include: { organization: { select: { name: true, isActive: true } } },
    });
    if (!invitation || invitation.status !== "PENDING" || invitation.expiresAt < new Date()) {
      throw new NotFoundException("This invitation is invalid, expired, or already used");
    }
    const existingUser = await this.prisma.unscoped.user.findUnique({ where: { email: invitation.email } });
    return {
      email: invitation.email,
      role: invitation.role,
      organizationName: invitation.organization.name,
      requiresAccountSetup: !existingUser,
    };
  }

  async accept(input: AcceptInvitationInput) {
    const invitation = await this.prisma.unscoped.invitation.findUnique({ where: { token: input.token } });
    if (!invitation || invitation.status !== "PENDING" || invitation.expiresAt < new Date()) {
      throw new NotFoundException("This invitation is invalid, expired, or already used");
    }
    const organization = await this.prisma.unscoped.organization.findUnique({
      where: { id: invitation.organizationId },
    });
    if (!organization || !organization.isActive) {
      throw new BadRequestException("This organization is not active");
    }

    let user = await this.prisma.unscoped.user.findUnique({ where: { email: invitation.email } });

    if (!user) {
      if (!input.name || !input.password) {
        throw new BadRequestException("Name and password are required to create your account");
      }
      const passwordHash = await argon2.hash(input.password);
      user = await this.prisma.unscoped.user.create({
        data: { email: invitation.email, name: input.name, passwordHash },
      });
    }

    // Idempotency: if somehow already a member, just consume the invite.
    const existingMembership = await this.prisma.unscoped.membership.findUnique({
      where: { userId_organizationId: { userId: user.id, organizationId: invitation.organizationId } },
    });

    if (!existingMembership) {
      await this.prisma.unscoped.membership.create({
        data: {
          userId: user.id,
          organizationId: invitation.organizationId,
          role: invitation.role,
          joinedAt: new Date(),
        },
      });
    }

    await this.prisma.unscoped.invitation.update({
      where: { id: invitation.id },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    });

    return { email: user.email, organizationName: organization.name };
  }

  /**
   * Prevents an org from losing its last active OWNER. Called before any
   * change that would demote or remove a member -- if the target is the only
   * remaining owner and the change drops them below OWNER, it's rejected.
   */
  private async guardLastOwner(organizationId: string, membershipId: string, currentRole: string, nextRole: string) {
    if (currentRole !== "OWNER" || nextRole === "OWNER") return;
    const otherOwners = await this.prisma.unscoped.membership.count({
      where: { organizationId, role: "OWNER", isActive: true, id: { not: membershipId } },
    });
    if (otherOwners === 0) {
      throw new BadRequestException("An organization must keep at least one owner");
    }
  }
}

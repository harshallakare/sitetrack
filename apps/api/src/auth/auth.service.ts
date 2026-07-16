import { randomBytes, createHash } from "node:crypto";
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import argon2 from "argon2";
import type {
  LoginInput,
  RegisterInput,
  Role,
} from "@sitetrack/shared-types";
import { isUniqueConstraintError } from "../common/prisma-errors";
import { slugify } from "../common/slugify";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationDispatchService } from "../notifications/notification-dispatch.service";
import type { AccessTokenPayload } from "./types";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Timing equalizer: when the email doesn't exist we still pay one argon2
// verification against this throwaway hash, so "no such account" and "wrong
// password" take indistinguishable time (anti account-enumeration).
let dummyHashPromise: Promise<string> | null = null;
function getDummyHash(): Promise<string> {
  return (dummyHashPromise ??= argon2.hash("timing-equalizer-not-a-real-password"));
}

interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
  role: Role;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: { id: string; name: string; email: string };
  activeOrganization: OrganizationSummary;
  organizations: OrganizationSummary[];
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly notifications: NotificationDispatchService
  ) {}

  async register(input: RegisterInput): Promise<AuthResult> {
    const email = input.email.toLowerCase().trim();

    const existing = await this.prisma.unscoped.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException("An account with this email already exists");
    }

    const passwordHash = await argon2.hash(input.password);
    const baseSlug = slugify(input.organizationName);
    let slug = baseSlug;
    let suffix = 1;
    // eslint-disable-next-line no-await-in-loop
    while (await this.prisma.unscoped.organization.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${++suffix}`;
    }

    let organization, user, membership;
    try {
      ({ organization, user, membership } = await this.prisma.unscoped.$transaction(async (tx) => {
        const organization = await tx.organization.create({
          data: { name: input.organizationName, slug },
        });
        const user = await tx.user.create({
          data: { email, name: input.name, passwordHash },
        });
        const membership = await tx.membership.create({
          data: {
            userId: user.id,
            organizationId: organization.id,
            role: "OWNER",
            joinedAt: new Date(),
          },
        });
        await tx.account.create({
          data: {
            organizationId: organization.id,
            name: "Cash",
            type: "CASH",
            description: "Default cash account for petty expenses and cash transactions",
          },
        });
        return { organization, user, membership };
      }));
    } catch (err) {
      // Two simultaneous registrations with the same email (or a slug race)
      // hit the unique constraint after the pre-checks passed -- return a
      // clean 409, not a 500.
      if (isUniqueConstraintError(err)) {
        throw new ConflictException("An account with this email already exists");
      }
      throw err;
    }

    return this.issueTokensFor(user.id, user.name, user.email, organization.id, organization.name, organization.slug, membership.role as Role);
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const email = input.email.toLowerCase().trim();
    const user = await this.prisma.unscoped.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      await argon2.verify(await getDummyHash(), input.password).catch(() => undefined);
      throw new UnauthorizedException("Invalid email or password");
    }

    const valid = await argon2.verify(user.passwordHash, input.password);
    if (!valid) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const memberships = await this.prisma.unscoped.membership.findMany({
      where: { userId: user.id, isActive: true },
      include: { organization: true },
      orderBy: { joinedAt: "asc" },
    });

    const active = memberships.find((m) => m.organization.isActive);
    if (!active) {
      throw new UnauthorizedException("No active organization membership found for this account");
    }

    return this.issueTokensFor(
      user.id,
      user.name,
      user.email,
      active.organizationId,
      active.organization.name,
      active.organization.slug,
      active.role as Role,
      memberships
    );
  }

  async refresh(rawRefreshToken: string): Promise<AuthResult> {
    const tokenHash = hashToken(rawRefreshToken);
    const stored = await this.prisma.unscoped.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true, organization: true },
    });

    // A replay of an ALREADY-ROTATED token means someone (attacker or victim)
    // is holding a stolen copy -- kill every session for that user so the
    // thief's live token dies too, then force a fresh login.
    if (stored?.revokedAt) {
      await this.prisma.unscoped.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException("Session revoked for security reasons. Please sign in again.");
    }

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException("Refresh token is invalid or expired");
    }

    // Rotate: revoke the used token so it can't be replayed.
    await this.prisma.unscoped.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const membership = await this.prisma.unscoped.membership.findUnique({
      where: { userId_organizationId: { userId: stored.userId, organizationId: stored.organizationId } },
    });
    if (!membership || !membership.isActive) {
      throw new UnauthorizedException("You no longer have access to this organization");
    }

    return this.issueTokensFor(
      stored.userId,
      stored.user.name,
      stored.user.email,
      stored.organizationId,
      stored.organization.name,
      stored.organization.slug,
      membership.role as Role
    );
  }

  async switchOrganization(userId: string, organizationId: string): Promise<AuthResult> {
    const membership = await this.prisma.unscoped.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
      include: { organization: true, user: true },
    });

    if (!membership || !membership.isActive || !membership.organization.isActive) {
      throw new UnauthorizedException("You do not have access to that organization");
    }

    return this.issueTokensFor(
      userId,
      membership.user.name,
      membership.user.email,
      organizationId,
      membership.organization.name,
      membership.organization.slug,
      membership.role as Role
    );
  }

  async getCurrentUser(userId: string) {
    const user = await this.prisma.unscoped.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, isPlatformAdmin: true, locale: true, theme: true },
    });
    if (!user) throw new UnauthorizedException("User not found");
    return user;
  }

  async updatePreferences(userId: string, prefs: { locale?: string; theme?: string }) {
    const user = await this.prisma.unscoped.user.update({
      where: { id: userId },
      data: {
        ...(prefs.locale !== undefined ? { locale: prefs.locale } : {}),
        ...(prefs.theme !== undefined ? { theme: prefs.theme } : {}),
      },
      select: { id: true, locale: true, theme: true },
    });
    return user;
  }

  /**
   * Always returns success regardless of whether the email exists -- this
   * endpoint must not reveal which emails have accounts. When the account
   * does exist, a single-use, 1-hour token is emailed via the dispatch
   * service. Only the token hash is stored.
   */
  async requestPasswordReset(email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.prisma.unscoped.user.findUnique({ where: { email: normalizedEmail } });
    if (!user || !user.isActive) return;

    const rawToken = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.unscoped.passwordResetToken.create({
      data: { userId: user.id, tokenHash: hashToken(rawToken), expiresAt },
    });

    const appBaseUrl = this.config.get<string>("CORS_ORIGIN") ?? "http://localhost:3000";
    const resetUrl = `${appBaseUrl.replace(/\/$/, "")}/reset-password?token=${rawToken}`;
    await this.notifications.dispatch({
      recipient: user.email,
      template: { name: "password_reset", data: { name: user.name, resetUrl } },
    });
  }

  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const stored = await this.prisma.unscoped.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(rawToken) },
    });
    if (!stored || stored.usedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException("This password reset link is invalid or expired");
    }

    const passwordHash = await argon2.hash(newPassword);
    await this.prisma.unscoped.$transaction([
      this.prisma.unscoped.user.update({ where: { id: stored.userId }, data: { passwordHash } }),
      this.prisma.unscoped.passwordResetToken.update({ where: { id: stored.id }, data: { usedAt: new Date() } }),
      // Invalidate the reset token's siblings and all refresh tokens so a
      // compromised session can't survive a password reset.
      this.prisma.unscoped.passwordResetToken.updateMany({
        where: { userId: stored.userId, usedAt: null },
        data: { usedAt: new Date() },
      }),
      this.prisma.unscoped.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  async logout(rawRefreshToken: string): Promise<void> {
    const tokenHash = hashToken(rawRefreshToken);
    await this.prisma.unscoped.refreshToken
      .update({ where: { tokenHash }, data: { revokedAt: new Date() } })
      .catch(() => undefined);
  }

  private async issueTokensFor(
    userId: string,
    userName: string,
    email: string,
    organizationId: string,
    organizationName: string,
    organizationSlug: string,
    role: Role,
    preloadedMemberships?: Array<{ organizationId: string; role: string; organization: { name: string; slug: string } }>
  ): Promise<AuthResult> {
    const membership = await this.prisma.unscoped.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
    });
    if (!membership) {
      throw new UnauthorizedException("Membership not found");
    }

    const payload: AccessTokenPayload = {
      sub: userId,
      organizationId,
      role,
      membershipId: membership.id,
    };

    const accessToken = this.jwt.sign(payload, {
      secret: this.config.get<string>("JWT_ACCESS_SECRET"),
      expiresIn: this.config.get<string>("JWT_ACCESS_TTL"),
    });

    const rawRefreshToken = randomBytes(48).toString("hex");
    const refreshTtlDays = this.parseDaysFromTtl(this.config.get<string>("JWT_REFRESH_TTL") ?? "30d");
    const expiresAt = new Date(Date.now() + refreshTtlDays * 24 * 60 * 60 * 1000);

    await this.prisma.unscoped.refreshToken.create({
      data: {
        userId,
        organizationId,
        tokenHash: hashToken(rawRefreshToken),
        expiresAt,
      },
    });

    const organizations: OrganizationSummary[] = preloadedMemberships
      ? preloadedMemberships.map((m) => ({
          id: m.organizationId,
          name: m.organization.name,
          slug: m.organization.slug,
          role: m.role as Role,
        }))
      : [{ id: organizationId, name: organizationName, slug: organizationSlug, role }];

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: { id: userId, name: userName, email },
      activeOrganization: { id: organizationId, name: organizationName, slug: organizationSlug, role },
      organizations,
    };
  }

  private parseDaysFromTtl(ttl: string): number {
    const match = /^(\d+)d$/.exec(ttl.trim());
    return match ? Number(match[1]) : 30;
  }
}

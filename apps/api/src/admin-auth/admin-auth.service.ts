import { randomBytes, createHash } from "node:crypto";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import argon2 from "argon2";
import { PrismaService } from "../prisma/prisma.service";
import type { AdminTokenPayload } from "./types";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Same timing-equalizer pattern as the tenant AuthService: unknown emails
// still pay one argon2 verification so response time can't be used to
// discover which addresses have (admin) accounts.
let dummyHashPromise: Promise<string> | null = null;
function getDummyHash(): Promise<string> {
  return (dummyHashPromise ??= argon2.hash("timing-equalizer-not-a-real-password"));
}

export interface AdminAuthResult {
  accessToken: string;
  refreshToken: string;
  user: { id: string; name: string; email: string };
}

interface RequestMeta {
  userAgent?: string;
  ip?: string;
}

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService
  ) {}

  async login(email: string, password: string, meta: RequestMeta): Promise<AdminAuthResult> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.prisma.unscoped.user.findUnique({ where: { email: normalizedEmail } });

    // Uniform error for "no such user", "wrong password", and "user exists
    // but isn't a platform admin" -- an attacker probing this endpoint
    // can't distinguish which case they hit, so they can't use it to
    // enumerate which accounts have admin privileges.
    const invalid = () => new UnauthorizedException("Invalid credentials");

    if (!user || !user.isActive) {
      await argon2.verify(await getDummyHash(), password).catch(() => undefined);
      throw invalid();
    }
    const passwordValid = await argon2.verify(user.passwordHash, password);
    if (!passwordValid) throw invalid();
    if (!user.isPlatformAdmin) throw invalid();

    return this.issueTokens(user.id, user.name, user.email, meta);
  }

  async refresh(rawRefreshToken: string, meta: RequestMeta): Promise<AdminAuthResult> {
    const tokenHash = hashToken(rawRefreshToken);
    const stored = await this.prisma.unscoped.adminSession.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    // Replay of an already-rotated admin session token = stolen copy in
    // play. Revoke every admin session for that user and force re-login.
    if (stored?.revokedAt) {
      await this.prisma.unscoped.adminSession.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException("Admin sessions revoked for security reasons. Please sign in again.");
    }

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException("Admin session is invalid or expired");
    }

    await this.prisma.unscoped.adminSession.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    if (!stored.user.isActive || !stored.user.isPlatformAdmin) {
      throw new UnauthorizedException("Admin access has been revoked for this account");
    }

    return this.issueTokens(stored.user.id, stored.user.name, stored.user.email, meta);
  }

  async logout(rawRefreshToken: string): Promise<void> {
    const tokenHash = hashToken(rawRefreshToken);
    await this.prisma.unscoped.adminSession
      .update({ where: { tokenHash }, data: { revokedAt: new Date() } })
      .catch(() => undefined);
  }

  async getCurrentAdmin(userId: string) {
    const user = await this.prisma.unscoped.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, isPlatformAdmin: true },
    });
    if (!user?.isPlatformAdmin) throw new UnauthorizedException("Admin access required");
    return user;
  }

  private async issueTokens(
    userId: string,
    name: string,
    email: string,
    meta: RequestMeta
  ): Promise<AdminAuthResult> {
    const payload: AdminTokenPayload = { sub: userId };

    const accessToken = this.jwt.sign(payload, {
      secret: this.config.get<string>("JWT_ADMIN_SECRET"),
      expiresIn: this.config.get<string>("JWT_ADMIN_ACCESS_TTL"),
    });

    const rawRefreshToken = randomBytes(48).toString("hex");
    const ttlDays = this.parseDays(this.config.get<string>("JWT_ADMIN_REFRESH_TTL") ?? "7d");
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

    await this.prisma.unscoped.adminSession.create({
      data: {
        userId,
        tokenHash: hashToken(rawRefreshToken),
        expiresAt,
        userAgent: meta.userAgent,
        ip: meta.ip,
      },
    });

    return { accessToken, refreshToken: rawRefreshToken, user: { id: userId, name, email } };
  }

  private parseDays(ttl: string): number {
    const match = /^(\d+)d$/.exec(ttl.trim());
    return match ? Number(match[1]) : 7;
  }
}

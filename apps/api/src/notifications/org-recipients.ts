import type { PrismaService } from "../prisma/prisma.service";

/**
 * Owner email addresses for an org -- the recipient set for automated
 * notifications (budget alerts, weekly digest). Always `.unscoped`: these
 * triggers fire from contexts with no per-request tenant CLS -- a background
 * cron job, or a create-delivery request whose own CLS context is scoped to
 * a different org lookup already in flight.
 */
export async function getOwnerEmails(prisma: PrismaService, organizationId: string): Promise<string[]> {
  const memberships = await prisma.unscoped.membership.findMany({
    where: { organizationId, role: "OWNER", isActive: true },
    select: { userId: true },
  });
  if (memberships.length === 0) return [];

  const users = await prisma.unscoped.user.findMany({
    where: { id: { in: memberships.map((m) => m.userId) } },
    select: { email: true },
  });
  return users.map((u) => u.email);
}

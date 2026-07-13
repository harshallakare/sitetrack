import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Revokes platform-admin from an account and revokes all its admin sessions
 * so the change takes effect immediately.
 * Usage: tsx prisma/demote-platform-admin.ts <email>
 */
async function main() {
  const email = process.argv[2]?.toLowerCase().trim();
  if (!email) {
    console.error("Usage: tsx prisma/demote-platform-admin.ts <email>");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`No user found with email "${email}"`);
    process.exit(1);
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { isPlatformAdmin: false } }),
    prisma.adminSession.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  console.log(`[demote-platform-admin] ${email} is no longer a platform admin (admin sessions revoked).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * There is no in-app path to create the first platform admin (by design --
 * it would otherwise be an unauthenticated privilege-escalation route).
 * Usage: tsx prisma/promote-platform-admin.ts <email>
 */
async function main() {
  const email = process.argv[2]?.toLowerCase().trim();
  if (!email) {
    console.error("Usage: tsx prisma/promote-platform-admin.ts <email>");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`No user found with email "${email}"`);
    process.exit(1);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { isPlatformAdmin: true },
  });

  console.log(`[promote-platform-admin] ${email} is now a platform admin.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

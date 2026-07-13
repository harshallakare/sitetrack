import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();

/**
 * Creates a DEDICATED platform-admin account -- an operator login that is
 * intentionally NOT a member of any organization, so it has no customer
 * panel access at all (the customer login requires an active membership).
 * This keeps admin credentials fully separate from any customer's email.
 *
 * Usage: tsx prisma/create-platform-admin.ts <email> <password> [name]
 */
async function main() {
  const email = process.argv[2]?.toLowerCase().trim();
  const password = process.argv[3];
  const name = process.argv[4] ?? "Platform Admin";

  if (!email || !password) {
    console.error("Usage: tsx prisma/create-platform-admin.ts <email> <password> [name]");
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.error(`A user with email "${email}" already exists. Use db:promote-admin to grant admin to an existing account.`);
    process.exit(1);
  }

  const passwordHash = await argon2.hash(password);
  const user = await prisma.user.create({
    data: { email, name, passwordHash, isPlatformAdmin: true },
  });

  console.log(`[create-platform-admin] Created dedicated admin account: ${user.email} (no organization membership).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { PrismaClient } from "@prisma/client";
import { STANDARD_ITEMS } from "./standard-items";

const prisma = new PrismaClient();

/**
 * Adds any STANDARD_ITEMS not already present (by name) to every existing
 * organization. Additive only -- never touches existing items, sites,
 * vendors, deliveries, or any other data. Safe to run against a database
 * that already has real usage on it (unlike seed.ts, which creates fresh
 * demo organizations and would collide on a second run).
 */
async function main() {
  const organizations = await prisma.organization.findMany();

  for (const org of organizations) {
    const existing = await prisma.item.findMany({
      where: { organizationId: org.id },
      select: { name: true },
    });
    const existingNames = new Set(existing.map((i) => i.name));

    const toCreate = STANDARD_ITEMS.filter((item) => !existingNames.has(item.name));
    if (toCreate.length === 0) {
      console.log(`[backfill-items] ${org.name}: already has all ${STANDARD_ITEMS.length} standard items`);
      continue;
    }

    await prisma.item.createMany({
      data: toCreate.map((item) => ({
        organizationId: org.id,
        name: item.name,
        unitOfMeasure: item.unitOfMeasure,
        category: item.category,
      })),
    });

    console.log(`[backfill-items] ${org.name}: added ${toCreate.length} items (had ${existingNames.size})`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

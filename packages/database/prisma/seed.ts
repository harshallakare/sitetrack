import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";
import { STANDARD_ITEMS } from "../src/standard-items";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "Password123!";

async function seedOrganization(params: {
  orgName: string;
  orgSlug: string;
  ownerName: string;
  ownerEmail: string;
  siteName: string;
}) {
  const passwordHash = await argon2.hash(DEMO_PASSWORD);

  const organization = await prisma.organization.create({
    data: { name: params.orgName, slug: params.orgSlug },
  });

  const user = await prisma.user.upsert({
    where: { email: params.ownerEmail },
    update: {},
    create: { email: params.ownerEmail, name: params.ownerName, passwordHash },
  });

  await prisma.membership.create({
    data: {
      userId: user.id,
      organizationId: organization.id,
      role: "OWNER",
      joinedAt: new Date(),
    },
  });

  const site = await prisma.site.create({
    data: {
      organizationId: organization.id,
      name: params.siteName,
      unitCount: 10,
      plannedSqft: 12000,
    },
  });

  await prisma.item.createMany({
    data: STANDARD_ITEMS.map((item) => ({
      organizationId: organization.id,
      name: item.name,
      unitOfMeasure: item.unitOfMeasure,
      category: item.category,
    })),
  });

  const vendor = await prisma.vendor.create({
    data: {
      organizationId: organization.id,
      contactPerson: "Ramesh Kumar",
      companyName: `${params.orgName} Suppliers`,
      phone: "9876543210",
      email: `vendor@${params.orgSlug}.example.com`,
    },
  });

  const account = await prisma.account.create({
    data: {
      organizationId: organization.id,
      siteId: site.id,
      name: "Cash",
      type: "CASH",
      description: "Default cash account for petty expenses",
      openingBalanceMinor: 0,
      currentBalanceMinor: 0,
    },
  });

  return { organization, user, site, vendor, account };
}

async function main() {
  const orgA = await seedOrganization({
    orgName: "Acme Builders",
    orgSlug: "acme-builders",
    ownerName: "Harshal Lakare",
    ownerEmail: "owner@acme-builders.example.com",
    siteName: "Chakan Phase 1",
  });

  const orgB = await seedOrganization({
    orgName: "Skyline Constructions",
    orgSlug: "skyline-constructions",
    ownerName: "Priya Sharma",
    ownerEmail: "owner@skyline-constructions.example.com",
    siteName: "Baner Heights",
  });

  console.log("Seeded 2 demo organizations:");
  console.log(`  - ${orgA.organization.name} (${orgA.organization.slug}) — login: ${orgA.user.email} / ${DEMO_PASSWORD}`);
  console.log(`  - ${orgB.organization.name} (${orgB.organization.slug}) — login: ${orgB.user.email} / ${DEMO_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

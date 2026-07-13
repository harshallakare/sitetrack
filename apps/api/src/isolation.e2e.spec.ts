import { execSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";

/**
 * THE regression guard for this codebase: boots the real AppModule (real
 * guards, real Prisma tenant-scoping extension) against a throwaway SQLite
 * database, registers two organizations over HTTP, and proves neither can
 * see or touch the other's data -- including direct-ID probes (IDOR), FK
 * smuggling, role enforcement, and the free-plan site limit.
 *
 * If a future refactor of prisma.service.ts / tenant-context.guard.ts breaks
 * isolation, this fails loudly in CI.
 */
jest.setTimeout(120_000);

describe("cross-tenant isolation (e2e)", () => {
  let app: INestApplication;
  let http: () => request.SuperTest<request.Test>;

  let tokenA: string;
  let tokenB: string;
  let vendorA: string;
  let vendorB: string;
  let siteA: string;

  beforeAll(async () => {
    // Isolated database per run -- never the dev database.
    const dir = mkdtempSync(path.join(tmpdir(), "sitetrack-e2e-"));
    process.env.DATABASE_PROVIDER = "sqlite";
    process.env.DATABASE_URL = `file:${path.join(dir, "e2e.db")}`;
    // Required by env validation; harmless dummies when not already set
    // (locally apps/api/.env provides real dev values via ConfigModule).
    process.env.JWT_ACCESS_SECRET ??= "e2e-access-secret";
    process.env.JWT_REFRESH_SECRET ??= "e2e-refresh-secret";
    process.env.JWT_ADMIN_SECRET ??= "e2e-admin-secret";
    process.env.ENCRYPTION_KEY ??= "0".repeat(64);

    const dbPackage = path.resolve(__dirname, "../../../packages/database");
    execSync("node scripts/generate-schema.js", { cwd: dbPackage, env: process.env, stdio: "pipe" });
    execSync("npx prisma migrate deploy", { cwd: dbPackage, env: process.env, stdio: "pipe" });

    // Imported AFTER env is pinned so PrismaClient/ConfigModule read it.
    const { Test } = await import("@nestjs/testing");
    const { AppModule } = await import("./app.module");
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    http = () => request(app.getHttpServer());
  });

  afterAll(async () => {
    await app?.close();
  });

  it("registers two isolated organizations", async () => {
    const resA = await http()
      .post("/auth/register")
      .send({ organizationName: "Org A", name: "Alice", email: "alice@a.test", password: "Password123!" })
      .expect(201);
    tokenA = resA.body.accessToken;

    const resB = await http()
      .post("/auth/register")
      .send({ organizationName: "Org B", name: "Bob", email: "bob@b.test", password: "Password123!" })
      .expect(201);
    tokenB = resB.body.accessToken;

    expect(resA.body.activeOrganization.id).not.toBe(resB.body.activeOrganization.id);
  });

  it("scopes list endpoints per organization", async () => {
    const createdA = await http()
      .post("/vendors")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ contactPerson: "Vendor Of A", companyName: "A Suppliers" })
      .expect(201);
    vendorA = createdA.body.id;

    const createdB = await http()
      .post("/vendors")
      .set("Authorization", `Bearer ${tokenB}`)
      .send({ contactPerson: "Vendor Of B" })
      .expect(201);
    vendorB = createdB.body.id;

    const listB = await http().get("/vendors").set("Authorization", `Bearer ${tokenB}`).expect(200);
    const idsSeenByB = listB.body.map((v: { id: string }) => v.id);
    expect(idsSeenByB).toContain(vendorB);
    expect(idsSeenByB).not.toContain(vendorA);
  });

  it("blocks direct-ID probes (IDOR) with 404, for reads, writes, and the ledger", async () => {
    await http().get(`/vendors/${vendorA}`).set("Authorization", `Bearer ${tokenB}`).expect(404);
    await http()
      .patch(`/vendors/${vendorA}`)
      .set("Authorization", `Bearer ${tokenB}`)
      .send({ contactPerson: "HACKED" })
      .expect(404);
    await http().get(`/vendors/${vendorA}/ledger`).set("Authorization", `Bearer ${tokenB}`).expect(404);

    // A's own access still works -- and is untouched by B's attempts.
    const mine = await http().get(`/vendors/${vendorA}`).set("Authorization", `Bearer ${tokenA}`).expect(200);
    expect(mine.body.contactPerson).toBe("Vendor Of A");
  });

  it("rejects cross-tenant foreign keys smuggled into creates", async () => {
    const site = await http()
      .post("/sites")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ name: "Site A" })
      .expect(201);
    siteA = site.body.id;

    const item = await http()
      .post("/items")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ name: "Cement", unitOfMeasure: "BAG" })
      .expect(201);

    // A tries to record a delivery against B's vendor: the FK exists in the
    // DB, but the scoped ownership check must reject it.
    await http()
      .post("/deliveries")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({
        siteId: siteA,
        vendorId: vendorB,
        deliveryDate: "2026-01-01",
        lineItems: [{ itemId: item.body.id, quantity: 1, unitPrice: 100 }],
      })
      .expect(404);
  });

  it("enforces the free plan's one-site limit", async () => {
    await http()
      .post("/sites")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ name: "Second Site" })
      .expect(403);
  });

  it("enforces roles: an ACCOUNTANT cannot create vendors", async () => {
    const invite = await http()
      .post("/members/invitations")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ email: "carol@a.test", role: "ACCOUNTANT" })
      .expect(201);

    await http()
      .post("/members/invitations/accept")
      .send({ token: invite.body.token, name: "Carol", password: "Password123!" })
      .expect(201);

    const login = await http()
      .post("/auth/login")
      .send({ email: "carol@a.test", password: "Password123!" })
      .expect(201);

    await http()
      .post("/vendors")
      .set("Authorization", `Bearer ${login.body.accessToken}`)
      .send({ contactPerson: "Should Fail" })
      .expect(403);

    // ...but she CAN read her own org's vendors, and only her org's.
    const list = await http()
      .get("/vendors")
      .set("Authorization", `Bearer ${login.body.accessToken}`)
      .expect(200);
    const ids = list.body.map((v: { id: string }) => v.id);
    expect(ids).toContain(vendorA);
    expect(ids).not.toContain(vendorB);
  });
});

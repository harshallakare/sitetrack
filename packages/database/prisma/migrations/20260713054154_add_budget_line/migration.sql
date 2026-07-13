-- CreateTable
CREATE TABLE "BudgetLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "plannedAmountMinor" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BudgetLine_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "BudgetLine_organizationId_idx" ON "BudgetLine"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetLine_siteId_category_key" ON "BudgetLine"("siteId", "category");

-- CreateTable
CREATE TABLE "VendorReturn" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "returnDate" DATETIME NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VendorReturn_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VendorReturn_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VendorReturn_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VendorReturnLineItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "vendorReturnId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "unitPriceMinor" INTEGER NOT NULL,
    "lineTotalMinor" INTEGER NOT NULL,
    CONSTRAINT "VendorReturnLineItem_vendorReturnId_fkey" FOREIGN KEY ("vendorReturnId") REFERENCES "VendorReturn" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VendorReturnLineItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "VendorReturn_organizationId_siteId_idx" ON "VendorReturn"("organizationId", "siteId");

-- CreateIndex
CREATE INDEX "VendorReturn_vendorId_idx" ON "VendorReturn"("vendorId");

-- CreateIndex
CREATE INDEX "VendorReturnLineItem_vendorReturnId_idx" ON "VendorReturnLineItem"("vendorReturnId");

-- CreateIndex
CREATE INDEX "VendorReturnLineItem_itemId_idx" ON "VendorReturnLineItem"("itemId");

-- CreateIndex
CREATE INDEX "VendorReturnLineItem_organizationId_idx" ON "VendorReturnLineItem"("organizationId");

-- CreateIndex
CREATE INDEX "VendorReturnLineItem_vendorId_idx" ON "VendorReturnLineItem"("vendorId");

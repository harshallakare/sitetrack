-- CreateTable
CREATE TABLE "ServiceBooking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "vendorId" TEXT,
    "bookingDate" DATETIME NOT NULL,
    "quantity" REAL NOT NULL,
    "rateMinor" INTEGER NOT NULL,
    "totalMinor" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "completedAt" DATETIME,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ServiceBooking_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ServiceBooking_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ServiceBooking_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ServiceBooking_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ServiceBooking_organizationId_siteId_idx" ON "ServiceBooking"("organizationId", "siteId");

-- CreateIndex
CREATE INDEX "ServiceBooking_serviceId_idx" ON "ServiceBooking"("serviceId");

-- CreateIndex
CREATE INDEX "ServiceBooking_vendorId_idx" ON "ServiceBooking"("vendorId");

-- AlterTable
ALTER TABLE "DeliveryLineItem" ADD COLUMN "vendorId" TEXT;

-- CreateIndex
CREATE INDEX "DeliveryLineItem_vendorId_idx" ON "DeliveryLineItem"("vendorId");

-- Backfill: copy vendorId from each line item's parent delivery so existing
-- rows participate in the groupBy-based payables aggregation.
UPDATE "DeliveryLineItem"
SET "vendorId" = (SELECT "vendorId" FROM "Delivery" WHERE "Delivery"."id" = "DeliveryLineItem"."deliveryId");

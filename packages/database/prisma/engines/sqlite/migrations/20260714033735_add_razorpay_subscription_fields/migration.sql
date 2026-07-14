-- AlterTable
ALTER TABLE "PaymentGatewayConfig" ADD COLUMN "webhookSecretEnc" TEXT;

-- AlterTable
ALTER TABLE "Plan" ADD COLUMN "providerPlanId" TEXT;

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN "currentPeriodEnd" DATETIME;
ALTER TABLE "Subscription" ADD COLUMN "providerSubscriptionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_providerSubscriptionId_key" ON "Subscription"("providerSubscriptionId");


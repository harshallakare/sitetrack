import { createHmac, timingSafeEqual } from "node:crypto";
import { BadRequestException, Injectable } from "@nestjs/common";
import Razorpay from "razorpay";
import { PrismaService } from "../prisma/prisma.service";
import { SecretCryptoService } from "../common/crypto/secret-crypto.service";

export interface ActiveGatewayCredentials {
  keyId: string;
  keySecret: string;
  webhookSecret: string | null;
}

interface PlanForCheckout {
  id: string;
  providerPlanId: string | null;
  name: string;
  priceMonthlyMinor: number;
}

/**
 * Wraps the Razorpay SDK for the one flow this app needs: recurring
 * subscriptions. `plans`/`subscriptions.create` calls hit Razorpay's real
 * API (test-mode keys in dev), so a client is instantiated per-call from
 * whatever gateway is currently active rather than cached at boot -- the
 * admin can change/rotate keys at any time.
 */
@Injectable()
export class RazorpayService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: SecretCryptoService
  ) {}

  /** Reads the active RAZORPAY config, decrypted. Throws a clear error if none is set up. */
  async activeCredentials(): Promise<ActiveGatewayCredentials> {
    const config = await this.prisma.unscoped.paymentGatewayConfig.findFirst({
      where: { provider: "RAZORPAY", isActive: true },
    });
    if (!config) {
      throw new BadRequestException(
        "No active payment gateway. Ask your platform administrator to configure and activate Razorpay."
      );
    }
    return {
      keyId: config.keyId,
      keySecret: this.crypto.decrypt(config.keySecretEnc),
      webhookSecret: config.webhookSecretEnc ? this.crypto.decrypt(config.webhookSecretEnc) : null,
    };
  }

  private client(creds: Pick<ActiveGatewayCredentials, "keyId" | "keySecret">) {
    return new Razorpay({ key_id: creds.keyId, key_secret: creds.keySecret });
  }

  /** Creates the Razorpay recurring plan for our Plan row on first use, then reuses it. */
  async ensureProviderPlan(plan: PlanForCheckout, creds: ActiveGatewayCredentials): Promise<string> {
    if (plan.providerPlanId) return plan.providerPlanId;

    const razorpay = this.client(creds);
    const created = await razorpay.plans
      .create({
        period: "monthly",
        interval: 1,
        item: { name: plan.name, amount: plan.priceMonthlyMinor, currency: "INR" },
      })
      .catch((err) => {
        throw new BadRequestException(razorpayErrorMessage(err));
      });

    // Global catalog row, not tenant-owned -- .unscoped is correct here (see
    // PlansService for the same pattern on Plan/Subscription).
    await this.prisma.unscoped.plan.update({ where: { id: plan.id }, data: { providerPlanId: created.id } });
    return created.id;
  }

  /** Starts a new Razorpay subscription for an org against a given Razorpay plan id. */
  async createSubscription(providerPlanId: string, organizationId: string, creds: ActiveGatewayCredentials) {
    const razorpay = this.client(creds);
    return razorpay.subscriptions
      .create({
        plan_id: providerPlanId,
        customer_notify: 1,
        // Razorpay requires a finite cycle count even for "indefinite" billing.
        // 120 monthly cycles (10 years) comfortably covers normal use; a
        // renewal well before then is simpler than modeling true infinity.
        total_count: 120,
        notes: { organizationId },
      })
      .catch((err) => {
        throw new BadRequestException(razorpayErrorMessage(err));
      });
  }

  /**
   * Cancels a Razorpay subscription at the end of the current billing cycle
   * (not immediately) -- the customer keeps access through what they already
   * paid for, and Razorpay itself fires the `subscription.cancelled` webhook
   * once the cycle actually ends.
   */
  async cancelSubscription(providerSubscriptionId: string, creds: ActiveGatewayCredentials) {
    const razorpay = this.client(creds);
    return razorpay.subscriptions.cancel(providerSubscriptionId, true).catch((err) => {
      throw new BadRequestException(razorpayErrorMessage(err));
    });
  }

  /**
   * Verifies the signature returned to the checkout success handler after
   * the customer authorizes payment (HMAC-SHA256 of "paymentId|subscriptionId"
   * with the key secret, per Razorpay's subscription checkout docs).
   */
  verifyCheckoutSignature(
    params: { paymentId: string; subscriptionId: string; signature: string },
    creds: Pick<ActiveGatewayCredentials, "keySecret">
  ): boolean {
    const expected = createHmac("sha256", creds.keySecret)
      .update(`${params.paymentId}|${params.subscriptionId}`)
      .digest("hex");
    return safeEqual(expected, params.signature);
  }

  /** Verifies the X-Razorpay-Signature header on an inbound webhook against the raw request body. */
  verifyWebhookSignature(rawBody: Buffer, signature: string, webhookSecret: string): boolean {
    const expected = createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
    return safeEqual(expected, signature);
  }
}

function safeEqual(expectedHex: string, actual: string): boolean {
  const expectedBuf = Buffer.from(expectedHex, "hex");
  const actualBuf = Buffer.from(actual, "hex");
  if (expectedBuf.length !== actualBuf.length) return false;
  return timingSafeEqual(expectedBuf, actualBuf);
}

// Razorpay SDK errors normalize to { statusCode, error: { description, code } }
// rather than throwing a plain Error -- without this, a rejected key/secret
// (or any other gateway-side failure) surfaces as an opaque 500 instead of a
// message an org owner or admin can actually act on.
function razorpayErrorMessage(err: unknown): string {
  const description = (err as { error?: { description?: string } })?.error?.description;
  return description
    ? `Payment gateway rejected the request: ${description}`
    : "Payment gateway request failed. Check the configured API keys.";
}

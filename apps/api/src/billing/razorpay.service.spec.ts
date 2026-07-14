import { createHmac } from "node:crypto";
import { RazorpayService } from "./razorpay.service";

// verifyCheckoutSignature/verifyWebhookSignature are pure HMAC checks --
// no DB/network needed, so the constructor deps are unused stand-ins.
const svc = new RazorpayService({} as any, {} as any);

describe("RazorpayService.verifyCheckoutSignature", () => {
  const keySecret = "test_key_secret";

  it("accepts a correctly signed checkout response", () => {
    const paymentId = "pay_123";
    const subscriptionId = "sub_456";
    const signature = createHmac("sha256", keySecret).update(`${paymentId}|${subscriptionId}`).digest("hex");

    expect(svc.verifyCheckoutSignature({ paymentId, subscriptionId, signature }, { keySecret })).toBe(true);
  });

  it("rejects a tampered signature", () => {
    const paymentId = "pay_123";
    const subscriptionId = "sub_456";
    const signature = createHmac("sha256", keySecret).update(`${paymentId}|${subscriptionId}`).digest("hex");
    const tampered = `${signature.slice(0, -2)}00`;

    expect(svc.verifyCheckoutSignature({ paymentId, subscriptionId, signature: tampered }, { keySecret })).toBe(
      false
    );
  });

  it("rejects a signature computed with a different subscription id (payload substitution)", () => {
    const paymentId = "pay_123";
    const signature = createHmac("sha256", keySecret).update(`${paymentId}|sub_456`).digest("hex");

    expect(
      svc.verifyCheckoutSignature({ paymentId, subscriptionId: "sub_999", signature }, { keySecret })
    ).toBe(false);
  });

  it("rejects a signature signed with the wrong secret", () => {
    const paymentId = "pay_123";
    const subscriptionId = "sub_456";
    const signature = createHmac("sha256", "wrong_secret").update(`${paymentId}|${subscriptionId}`).digest("hex");

    expect(svc.verifyCheckoutSignature({ paymentId, subscriptionId, signature }, { keySecret })).toBe(false);
  });
});

describe("RazorpayService.verifyWebhookSignature", () => {
  const webhookSecret = "test_webhook_secret";

  it("accepts a correctly signed webhook body", () => {
    const body = Buffer.from(JSON.stringify({ event: "subscription.charged" }));
    const signature = createHmac("sha256", webhookSecret).update(body).digest("hex");

    expect(svc.verifyWebhookSignature(body, signature, webhookSecret)).toBe(true);
  });

  it("rejects a body that doesn't match the signature (tampered payload)", () => {
    const body = Buffer.from(JSON.stringify({ event: "subscription.charged" }));
    const signature = createHmac("sha256", webhookSecret).update(body).digest("hex");
    const tamperedBody = Buffer.from(JSON.stringify({ event: "subscription.cancelled" }));

    expect(svc.verifyWebhookSignature(tamperedBody, signature, webhookSecret)).toBe(false);
  });

  it("rejects a signature of the wrong length instead of throwing", () => {
    const body = Buffer.from("{}");
    expect(svc.verifyWebhookSignature(body, "not-hex-and-wrong-length", webhookSecret)).toBe(false);
  });
});

import { z } from "zod";

export const setOrganizationPlanSchema = z.object({
  planSlug: z.string().min(1).max(60),
});
export type SetOrganizationPlanInput = z.infer<typeof setOrganizationPlanSchema>;

// Response from POST /billing/checkout: what the frontend needs to open the
// gateway's checkout modal (Razorpay Checkout.js today).
export interface CheckoutSessionResult {
  provider: "RAZORPAY";
  keyId: string;
  subscriptionId: string;
}

// Body posted back from the gateway's checkout success handler, forwarded to
// POST /billing/checkout/verify for server-side signature verification.
export const verifyCheckoutSchema = z.object({
  razorpayPaymentId: z.string().min(1).max(200),
  razorpaySubscriptionId: z.string().min(1).max(200),
  razorpaySignature: z.string().min(1).max(500),
});
export type VerifyCheckoutInput = z.infer<typeof verifyCheckoutSchema>;

import { z } from "zod";

export const setOrganizationPlanSchema = z.object({
  planSlug: z.string().min(1).max(60),
});
export type SetOrganizationPlanInput = z.infer<typeof setOrganizationPlanSchema>;

// Admin edits a plan's displayed name/price. Changing priceMonthlyMinor also
// clears the plan's cached Razorpay plan id server-side (Razorpay plans are
// immutable once created), so the next checkout mints a fresh provider plan
// at the new price instead of silently keeping the old amount.
export const updatePlanSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  priceMonthlyMinor: z.number().int().min(0).max(100_000_000).optional(),
});
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;

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

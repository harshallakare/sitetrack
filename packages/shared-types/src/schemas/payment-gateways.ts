import { z } from "zod";

export const PAYMENT_PROVIDERS = ["RAZORPAY", "STRIPE", "PAYU", "CASHFREE"] as const;
export const paymentProviderSchema = z.enum(PAYMENT_PROVIDERS);
export type PaymentProvider = z.infer<typeof paymentProviderSchema>;

export const PAYMENT_MODES = ["TEST", "LIVE"] as const;
export const paymentModeSchema = z.enum(PAYMENT_MODES);
export type PaymentMode = z.infer<typeof paymentModeSchema>;

// Provider registry: the pluggable part. Each entry declares the human label
// and the field labels a given gateway needs (key id + secret), so the admin
// UI is generated from this rather than hardcoded per provider, and adding a
// new gateway is a one-line addition here + a driver later.
export interface PaymentProviderDescriptor {
  provider: PaymentProvider;
  label: string;
  keyIdLabel: string;
  keySecretLabel: string;
  docsHint: string;
}

export const PAYMENT_PROVIDER_REGISTRY: Record<PaymentProvider, PaymentProviderDescriptor> = {
  RAZORPAY: {
    provider: "RAZORPAY",
    label: "Razorpay",
    keyIdLabel: "Key ID",
    keySecretLabel: "Key Secret",
    docsHint: "Dashboard → Settings → API Keys",
  },
  STRIPE: {
    provider: "STRIPE",
    label: "Stripe",
    keyIdLabel: "Publishable Key",
    keySecretLabel: "Secret Key",
    docsHint: "Dashboard → Developers → API keys",
  },
  PAYU: {
    provider: "PAYU",
    label: "PayU",
    keyIdLabel: "Merchant Key",
    keySecretLabel: "Merchant Salt",
    docsHint: "Dashboard → Settings → Merchant Key/Salt",
  },
  CASHFREE: {
    provider: "CASHFREE",
    label: "Cashfree",
    keyIdLabel: "App ID",
    keySecretLabel: "Secret Key",
    docsHint: "Dashboard → Developers → API Keys",
  },
};

export const upsertPaymentGatewaySchema = z.object({
  provider: paymentProviderSchema,
  mode: paymentModeSchema.default("TEST"),
  keyId: z.string().min(1).max(300),
  // Omit / empty to keep the stored secret unchanged when editing.
  keySecret: z.string().max(500).optional(),
  // Optional: webhooks can be configured after the gateway itself is set up.
  // Omit / empty to keep the stored one unchanged when editing.
  webhookSecret: z.string().max(500).optional(),
});
export type UpsertPaymentGatewayInput = z.infer<typeof upsertPaymentGatewaySchema>;

export const activatePaymentGatewaySchema = z.object({
  isActive: z.boolean(),
});
export type ActivatePaymentGatewayInput = z.infer<typeof activatePaymentGatewaySchema>;

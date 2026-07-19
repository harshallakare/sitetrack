"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { CheckoutSessionResult } from "@sitetrack/shared-types";
import { Button } from "@/components/ui/button";
import { clientFetch } from "@/lib/client-api";
import { usePreferences } from "@/components/providers/preferences-provider";

interface RazorpayCheckoutResponse {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
}

interface RazorpayInstance {
  open: () => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

function loadRazorpayScript(errorMessage: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(errorMessage));
    document.body.appendChild(script);
  });
}

export function UpgradeButton() {
  const router = useRouter();
  const { t } = usePreferences();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleUpgrade() {
    setBusy(true);
    setError(null);
    try {
      const session = await clientFetch<CheckoutSessionResult>("/billing/checkout", { method: "POST" });
      await loadRazorpayScript(t("billing.checkoutScriptFailed"));

      if (!window.Razorpay) throw new Error(t("billing.checkoutScriptMissing"));

      const razorpay = new window.Razorpay({
        key: session.keyId,
        subscription_id: session.subscriptionId,
        name: "SiteTrack",
        description: "Unlimited sites plan",
        theme: { color: "#0f172a" },
        handler: async (response: RazorpayCheckoutResponse) => {
          try {
            await clientFetch("/billing/checkout/verify", {
              method: "POST",
              body: JSON.stringify({
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySubscriptionId: response.razorpay_subscription_id,
                razorpaySignature: response.razorpay_signature,
              }),
            });
            router.refresh();
          } catch (err) {
            setError(err instanceof Error ? err.message : t("billing.verifyFailed"));
          } finally {
            setBusy(false);
          }
        },
        modal: {
          ondismiss: () => setBusy(false),
        },
      });
      razorpay.open();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("billing.checkoutFailed"));
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button size="sm" onClick={handleUpgrade} disabled={busy}>
        {busy ? t("billing.openingCheckout") : t("billing.upgrade")}
      </Button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

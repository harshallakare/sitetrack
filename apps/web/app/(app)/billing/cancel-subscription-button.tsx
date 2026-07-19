"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { clientFetch } from "@/lib/client-api";
import { usePreferences } from "@/components/providers/preferences-provider";

export function CancelSubscriptionButton() {
  const router = useRouter();
  const { t } = usePreferences();
  const [confirming, setConfirming] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleConfirm() {
    setBusy(true);
    setError(null);
    try {
      await clientFetch("/billing/cancel", { method: "POST" });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("billing.cancelFailed"));
      setBusy(false);
    }
  }

  if (!confirming) {
    return (
      <Button size="sm" variant="outline" onClick={() => setConfirming(true)}>
        {t("billing.cancelSubscription")}
      </Button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">{t("billing.cancelConfirm")}</span>
        <Button size="sm" variant="destructive" onClick={handleConfirm} disabled={busy}>
          {busy ? t("billing.cancellingInProgress") : t("billing.yesCancel")}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setConfirming(false)} disabled={busy}>
          {t("billing.keepIt")}
        </Button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

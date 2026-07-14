"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { clientFetch } from "@/lib/client-api";

export function CancelSubscriptionButton() {
  const router = useRouter();
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
      setError(err instanceof Error ? err.message : "Failed to cancel");
      setBusy(false);
    }
  }

  if (!confirming) {
    return (
      <Button size="sm" variant="outline" onClick={() => setConfirming(true)}>
        Cancel subscription
      </Button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Cancel at the end of this billing period?</span>
        <Button size="sm" variant="destructive" onClick={handleConfirm} disabled={busy}>
          {busy ? "Cancelling…" : "Yes, cancel"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setConfirming(false)} disabled={busy}>
          Keep it
        </Button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

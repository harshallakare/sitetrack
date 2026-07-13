"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { clientFetch } from "@/lib/client-api";

/**
 * Deletes a resource via the tenant proxy, with a confirm prompt, then
 * refreshes the current route. Used for correcting deliveries/payments.
 */
export function DeleteButton({ path, confirmMessage }: { path: string; confirmMessage: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  async function handleDelete() {
    if (!window.confirm(confirmMessage)) return;
    setBusy(true);
    try {
      await clientFetch(path, { method: "DELETE" });
      router.refresh();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={busy}
      aria-label="Delete"
      className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-red-600 disabled:opacity-50"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}

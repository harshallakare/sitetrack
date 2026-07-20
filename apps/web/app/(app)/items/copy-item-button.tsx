"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Copy } from "lucide-react";
import { clientFetch } from "@/lib/client-api";
import { usePreferences } from "@/components/providers/preferences-provider";

interface CopyableItem {
  name: string;
  unitOfMeasure: string;
  category: string | null;
  description: string | null;
}

export function CopyItemButton({ item }: { item: CopyableItem }) {
  const router = useRouter();
  const { t } = usePreferences();
  const [busy, setBusy] = React.useState(false);

  async function handleCopy() {
    setBusy(true);
    try {
      await clientFetch("/items", {
        method: "POST",
        body: JSON.stringify({
          name: `${item.name} (${t("items.copySuffix")})`,
          unitOfMeasure: item.unitOfMeasure,
          category: item.category ?? undefined,
          description: item.description ?? undefined,
        }),
      });
      router.refresh();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : t("items.form.copyFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={handleCopy}
      disabled={busy}
      aria-label={t("common.copy")}
      className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
    >
      <Copy className="h-4 w-4" />
    </button>
  );
}

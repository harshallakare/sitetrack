"use client";

import * as React from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { clientFetch } from "@/lib/client-api";
import { usePreferences } from "@/components/providers/preferences-provider";

interface TallyExportResult {
  filename: string;
  xml: string;
  voucherCount: number;
}

export function TallyExportCard() {
  const { t } = usePreferences();
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [note, setNote] = React.useState<string | null>(null);

  async function handleExport() {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const data = await clientFetch<TallyExportResult>(`/export/tally?${params.toString()}`);
      if (data.voucherCount === 0) {
        setNote(t("tally.noData"));
        return;
      }
      const blob = new Blob([data.xml], { type: "application/xml;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.filename;
      a.click();
      URL.revokeObjectURL(url);
      setNote(t("tally.exported").replace("{count}", String(data.voucherCount)));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("tally.failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <div>
        <h2 className="font-semibold">{t("tally.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("tally.subtitle")}</p>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tally-from">{t("tally.from")}</Label>
          <Input id="tally-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tally-to">{t("tally.to")}</Label>
          <Input id="tally-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <Button onClick={handleExport} disabled={busy}>
          <Download className="h-4 w-4" /> {busy ? t("common.saving") : t("tally.export")}
        </Button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {note && <p className="text-sm text-muted-foreground">{note}</p>}
    </div>
  );
}

"use client";

import { Download } from "lucide-react";
import { fromMinorUnits } from "@sitetrack/shared-types";
import { Button } from "@/components/ui/button";
import { usePreferences } from "@/components/providers/preferences-provider";

interface HistoryEntry {
  date: string;
  vendorName: string;
  siteName: string;
  quantity: number;
  unitPriceMinor: number;
  lineTotalMinor: number;
}

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export function ExportReportButton({ itemName, history }: { itemName: string; history: HistoryEntry[] }) {
  const { t } = usePreferences();

  function handleExport() {
    const header = [
      t("deliveries.form.deliveryDate"),
      t("common.vendor"),
      t("common.site"),
      t("deliveries.form.qty"),
      t("deliveries.form.price"),
      t("common.amount"),
    ];
    const rows = history.map((h) => [
      new Date(h.date).toLocaleDateString("en-IN"),
      h.vendorName,
      h.siteName,
      String(h.quantity),
      fromMinorUnits(h.unitPriceMinor).toFixed(2),
      fromMinorUnits(h.lineTotalMinor).toFixed(2),
    ]);
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${itemName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-deliveries.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button variant="outline" onClick={handleExport} disabled={history.length === 0}>
      <Download className="h-4 w-4" /> {t("items.exportReport")}
    </Button>
  );
}

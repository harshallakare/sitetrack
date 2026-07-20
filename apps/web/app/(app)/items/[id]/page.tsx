import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Truck, BarChart3 } from "lucide-react";
import { serverFetch } from "@/lib/server-api";
import { fromMinorUnits } from "@sitetrack/shared-types";
import { getServerT } from "@/lib/i18n/server";
import { Button } from "@/components/ui/button";
import { ExportReportButton } from "./export-report-button";

interface HistoryEntry {
  id: string;
  deliveryId: string;
  date: string;
  vendorName: string;
  siteName: string;
  quantity: number;
  unitPriceMinor: number;
  lineTotalMinor: number;
}
interface ItemDetail {
  item: { id: string; name: string; unitOfMeasure: string; category: string | null; description: string | null };
  stats: {
    totalDeliveries: number;
    totalDelivered: number;
    avgUnitPriceMinor: number;
    minUnitPriceMinor: number;
    maxUnitPriceMinor: number;
  };
  history: HistoryEntry[];
}

const CHART_WIDTH = 600;
const CHART_HEIGHT = 140;

function money(minor: number) {
  return `₹${fromMinorUnits(minor).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function priceTrendPoints(history: HistoryEntry[]): string {
  const chronological = [...history].reverse(); // history arrives newest-first; the chart reads left-to-right oldest-first
  const prices = chronological.map((h) => h.unitPriceMinor);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const stepX = chronological.length > 1 ? CHART_WIDTH / (chronological.length - 1) : 0;
  return chronological
    .map((h, i) => {
      const x = chronological.length > 1 ? i * stepX : CHART_WIDTH / 2;
      const y = CHART_HEIGHT - ((h.unitPriceMinor - min) / range) * (CHART_HEIGHT - 20) - 10;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export default async function ItemDetailPage({ params }: { params: { id: string } }) {
  const t = getServerT();
  const detail = await serverFetch<ItemDetail>(`/items/${params.id}/detail`).catch(() => null);
  if (!detail) notFound();
  const { item, stats, history } = detail;
  const points = history.length > 1 ? priceTrendPoints(history) : "";
  const unitLabel = item.unitOfMeasure.replace("_", " ").toLowerCase();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/items"
            className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> {t("items.backToItems")}
          </Link>
          <h1 className="mt-2 text-2xl font-bold">{item.name}</h1>
          <p className="text-sm text-muted-foreground">{t("items.detailSubtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportReportButton itemName={item.name} history={history} />
          <Button asChild>
            <Link href="/deliveries">
              <Truck className="h-4 w-4" /> {t("deliveries.recordDelivery")}
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-border p-4 lg:col-span-1">
          <h2 className="mb-3 font-semibold">{t("items.itemInformation")}</h2>
          <div className="flex flex-col gap-3 text-sm">
            <div>
              <div className="text-muted-foreground">{t("items.form.name")}</div>
              <div className="font-medium">{item.name}</div>
            </div>
            {item.description && (
              <div>
                <div className="text-muted-foreground">{t("common.description")}</div>
                <div>{item.description}</div>
              </div>
            )}
            <div>
              <div className="text-muted-foreground">{t("items.form.unit")}</div>
              <div>{item.unitOfMeasure.replace("_", " ")}</div>
            </div>
            {item.category && (
              <div>
                <div className="text-muted-foreground">{t("common.category")}</div>
                <div>{item.category}</div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:col-span-2">
          <div className="rounded-lg border border-border p-4">
            <div className="text-xs uppercase text-muted-foreground">{t("items.detailTotalDeliveries")}</div>
            <div className="text-2xl font-bold">{stats.totalDeliveries}</div>
          </div>
          <div className="rounded-lg border border-border p-4">
            <div className="text-xs uppercase text-muted-foreground">{t("items.totalDelivered")}</div>
            <div className="text-2xl font-bold">{stats.totalDelivered}</div>
            <div className="text-xs text-muted-foreground">{unitLabel}</div>
          </div>
          <div className="rounded-lg border border-border p-4">
            <div className="text-xs uppercase text-muted-foreground">{t("items.detailAvgUnitPrice")}</div>
            <div className="text-2xl font-bold text-primary">{money(stats.avgUnitPriceMinor)}</div>
          </div>

          <div className="rounded-lg border border-border p-4 sm:col-span-3">
            <h2 className="mb-3 font-semibold">{t("items.priceRange")}</h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-xl font-bold text-green-600">{money(stats.minUnitPriceMinor)}</div>
                <div className="text-xs text-muted-foreground">{t("items.lowest")}</div>
              </div>
              <div>
                <div className="text-xl font-bold">{money(stats.avgUnitPriceMinor)}</div>
                <div className="text-xs text-muted-foreground">{t("items.average")}</div>
              </div>
              <div>
                <div className="text-xl font-bold text-primary">{money(stats.maxUnitPriceMinor)}</div>
                <div className="text-xs text-muted-foreground">{t("items.highest")}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border p-4">
        <h2 className="mb-3 font-semibold">{t("items.priceTrend")}</h2>
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
            <BarChart3 className="h-8 w-8" />
            <p className="text-sm">{t("items.noDeliveryData")}</p>
          </div>
        ) : history.length === 1 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
            <p className="text-sm">{money(history[0].unitPriceMinor)}</p>
          </div>
        ) : (
          <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} className="w-full" preserveAspectRatio="none">
            <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" className="text-primary" />
          </svg>
        )}
      </div>

      <div className="rounded-lg border border-border">
        <div className="flex items-center justify-between border-b border-border px-4 py-3 font-semibold">
          <span>{t("items.deliveryHistory")}</span>
          <span className="text-xs font-normal text-muted-foreground">
            {stats.totalDeliveries} {t("deliveries.title").toLowerCase()}
          </span>
        </div>
        {history.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">{t("items.noDeliveryData")}</p>
        ) : (
          <div className="divide-y divide-border">
            {history.map((h) => (
              <div key={h.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="text-sm font-medium">
                    {h.vendorName} · {h.siteName}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(h.date).toLocaleDateString("en-IN")} · {h.quantity} {unitLabel} @ {money(h.unitPriceMinor)}
                  </div>
                </div>
                <div className="font-semibold">{money(h.lineTotalMinor)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

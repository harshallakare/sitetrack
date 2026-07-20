"use client";

import * as React from "react";
import { BarChart3, Save, RotateCcw, X } from "lucide-react";
import { fromMinorUnits } from "@sitetrack/shared-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { clientFetch } from "@/lib/client-api";
import { usePreferences } from "@/components/providers/preferences-provider";

interface TagOption {
  id: string;
  name: string;
}

interface CostAnalyticsResult {
  totalAmountMinor: number;
  totalDeliveries: number;
  lineItemCount: number;
  byItem: Array<{ itemId: string; itemName: string; totalMinor: number; quantity: number }>;
  byCategory: Array<{ category: string; totalMinor: number }>;
}

interface SavedFilterSet {
  id: string;
  name: string;
  tagIds: string[];
  dateFrom: string;
  dateTo: string;
  minAmount: string;
  maxAmount: string;
}

const STORAGE_KEY = "sitetrack.analytics.savedFilters";

function money(minor: number) {
  return `₹${fromMinorUnits(minor).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function AnalyticsFilters({ tags }: { tags: TagOption[] }) {
  const { t } = usePreferences();
  const [tagSearch, setTagSearch] = React.useState("");
  const [selectedTagIds, setSelectedTagIds] = React.useState<string[]>([]);
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [minAmount, setMinAmount] = React.useState("");
  const [maxAmount, setMaxAmount] = React.useState("");
  const [result, setResult] = React.useState<CostAnalyticsResult | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [savedFilters, setSavedFilters] = React.useState<SavedFilterSet[]>([]);

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setSavedFilters(JSON.parse(raw));
    } catch {
      // ignore corrupt localStorage
    }
  }, []);

  const selectedTags = tags.filter((tag) => selectedTagIds.includes(tag.id));
  const filteredTagOptions = tags.filter(
    (tag) => !selectedTagIds.includes(tag.id) && tag.name.toLowerCase().includes(tagSearch.toLowerCase())
  );

  function toggleTag(id: string) {
    setSelectedTagIds((prev) => [...prev, id]);
    setTagSearch("");
  }
  function removeTag(id: string) {
    setSelectedTagIds((prev) => prev.filter((t) => t !== id));
  }

  function resetFilters() {
    setSelectedTagIds([]);
    setTagSearch("");
    setDateFrom("");
    setDateTo("");
    setMinAmount("");
    setMaxAmount("");
    setResult(null);
    setError(null);
  }

  async function calculate() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedTagIds.length) params.set("tagIds", selectedTagIds.join(","));
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      if (minAmount) params.set("minAmount", minAmount);
      if (maxAmount) params.set("maxAmount", maxAmount);
      const data = await clientFetch<CostAnalyticsResult>(`/analytics/costs?${params.toString()}`);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("analytics.calculateFailed"));
    } finally {
      setLoading(false);
    }
  }

  function saveFilters() {
    const name = window.prompt(t("analytics.savePrompt"));
    if (!name) return;
    const next: SavedFilterSet[] = [
      ...savedFilters,
      { id: crypto.randomUUID(), name, tagIds: selectedTagIds, dateFrom, dateTo, minAmount, maxAmount },
    ];
    setSavedFilters(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function applySavedFilter(f: SavedFilterSet) {
    setSelectedTagIds(f.tagIds);
    setDateFrom(f.dateFrom);
    setDateTo(f.dateTo);
    setMinAmount(f.minAmount);
    setMaxAmount(f.maxAmount);
  }

  function removeSavedFilter(id: string) {
    const next = savedFilters.filter((f) => f.id !== id);
    setSavedFilters(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
      <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
        <h2 className="text-xs font-semibold uppercase text-muted-foreground">{t("analytics.filters")}</h2>

        <div className="flex flex-col gap-1.5">
          <Label>{t("analytics.selectTags")}</Label>
          <Input value={tagSearch} onChange={(e) => setTagSearch(e.target.value)} placeholder={t("analytics.selectTags")} />
          {tagSearch && filteredTagOptions.length > 0 && (
            <div className="max-h-32 overflow-y-auto rounded-md border border-border">
              {filteredTagOptions.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => toggleTag(tag.id)}
                  className="block w-full px-3 py-1.5 text-left text-sm hover:bg-muted"
                >
                  {tag.name}
                </button>
              ))}
            </div>
          )}
          {selectedTags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {selectedTags.map((tag) => (
                <span
                  key={tag.id}
                  className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
                >
                  {tag.name}
                  <button onClick={() => removeTag(tag.id)} aria-label={t("common.delete")}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">{t("analytics.noTagsSelected")}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>{t("analytics.dateRange")}</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>{t("analytics.amountRange")}</Label>
          <Input
            type="number"
            step="any"
            value={minAmount}
            onChange={(e) => setMinAmount(e.target.value)}
            placeholder={t("analytics.minAmount")}
          />
          <Input
            type="number"
            step="any"
            value={maxAmount}
            onChange={(e) => setMaxAmount(e.target.value)}
            placeholder={t("analytics.maxAmount")}
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <Button onClick={calculate} disabled={loading}>
          <BarChart3 className="h-4 w-4" /> {loading ? t("common.saving") : t("analytics.calculate")}
        </Button>
        <Button variant="outline" onClick={resetFilters}>
          <RotateCcw className="h-4 w-4" /> {t("analytics.resetFilters")}
        </Button>
        <button
          onClick={saveFilters}
          className="flex items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
        >
          <Save className="h-4 w-4" /> {t("analytics.saveFilters")}
        </button>

        <div className="border-t border-border pt-3">
          <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">{t("analytics.savedSettings")}</h3>
          {savedFilters.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t("analytics.noSavedSettings")}</p>
          ) : (
            <div className="flex flex-col gap-1">
              {savedFilters.map((f) => (
                <div key={f.id} className="flex items-center justify-between gap-2">
                  <button onClick={() => applySavedFilter(f)} className="truncate text-left text-sm text-primary hover:underline">
                    {f.name}
                  </button>
                  <button onClick={() => removeSavedFilter(f.id)} aria-label={t("common.delete")} className="text-muted-foreground hover:text-red-600">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-border p-4">
        {!result ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-muted-foreground">
            <BarChart3 className="h-8 w-8" />
            <p className="font-semibold text-foreground">{t("analytics.results")}</p>
            <p className="text-sm">{t("analytics.applyFiltersPrompt")}</p>
          </div>
        ) : result.lineItemCount === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-muted-foreground">
            <BarChart3 className="h-8 w-8" />
            <p className="text-sm">{t("analytics.noResults")}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-md bg-muted p-3">
                <div className="text-xs uppercase text-muted-foreground">{t("analytics.totalAmount")}</div>
                <div className="text-xl font-bold text-primary">{money(result.totalAmountMinor)}</div>
              </div>
              <div className="rounded-md bg-muted p-3">
                <div className="text-xs uppercase text-muted-foreground">{t("analytics.totalDeliveries")}</div>
                <div className="text-xl font-bold">{result.totalDeliveries}</div>
              </div>
              <div className="rounded-md bg-muted p-3">
                <div className="text-xs uppercase text-muted-foreground">{t("analytics.lineItems")}</div>
                <div className="text-xl font-bold">{result.lineItemCount}</div>
              </div>
            </div>

            <div>
              <h3 className="mb-2 font-semibold">{t("analytics.byItem")}</h3>
              <div className="divide-y divide-border rounded-md border border-border">
                {result.byItem.map((row) => (
                  <div key={row.itemId} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span>{row.itemName}</span>
                    <span className="font-medium">{money(row.totalMinor)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-2 font-semibold">{t("analytics.byCategory")}</h3>
              <div className="divide-y divide-border rounded-md border border-border">
                {result.byCategory.map((row) => (
                  <div key={row.category} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span>{row.category}</span>
                    <span className="font-medium">{money(row.totalMinor)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

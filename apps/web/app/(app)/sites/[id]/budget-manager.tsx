"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { fromMinorUnits } from "@sitetrack/shared-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { clientFetch } from "@/lib/client-api";

interface BudgetRow {
  id: string | null;
  category: string;
  plannedMinor: number;
  actualMinor: number;
  varianceMinor: number;
  budgeted: boolean;
}
export interface SiteBudget {
  site: { id: string; name: string };
  totalPlannedMinor: number;
  totalActualMinor: number;
  totalVarianceMinor: number;
  rows: BudgetRow[];
}

function money(minor: number) {
  return `₹${fromMinorUnits(minor).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export function BudgetManager({ siteId, budget }: { siteId: string; budget: SiteBudget }) {
  const router = useRouter();
  const [category, setCategory] = React.useState("");
  const [planned, setPlanned] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function setBudget(cat: string, amount: number) {
    setBusy(true);
    setError(null);
    try {
      await clientFetch(`/sites/${siteId}/budget`, {
        method: "PUT",
        body: JSON.stringify({ category: cat, plannedAmount: amount }),
      });
      setCategory("");
      setPlanned("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  const overBudget = budget.totalVarianceMinor < 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border p-4">
          <div className="text-xs uppercase text-muted-foreground">Planned</div>
          <div className="text-2xl font-bold">{money(budget.totalPlannedMinor)}</div>
        </div>
        <div className="rounded-lg border border-border p-4">
          <div className="text-xs uppercase text-muted-foreground">Actual</div>
          <div className="text-2xl font-bold">{money(budget.totalActualMinor)}</div>
        </div>
        <div className="rounded-lg border border-border p-4">
          <div className="text-xs uppercase text-muted-foreground">Variance</div>
          <div className={`text-2xl font-bold ${overBudget ? "text-red-600" : "text-green-600"}`}>
            {overBudget ? "−" : "+"}
            {money(Math.abs(budget.totalVarianceMinor))}
          </div>
          <div className="text-xs text-muted-foreground">{overBudget ? "Over budget" : "Under budget"}</div>
        </div>
      </div>

      {/* Rows */}
      <div className="rounded-lg border border-border">
        <div className="border-b border-border px-4 py-3 font-semibold">By category</div>
        {budget.rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            No budget lines or spend yet. Add a category budget below.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {budget.rows.map((r) => {
              const pct = r.plannedMinor > 0 ? Math.min(100, Math.round((r.actualMinor / r.plannedMinor) * 100)) : 0;
              const over = r.varianceMinor < 0;
              return (
                <div key={r.category} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">
                      {r.category}
                      {!r.budgeted && (
                        <span className="ml-2 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-600">
                          no budget set
                        </span>
                      )}
                    </div>
                    <div className="text-sm">
                      <span className="font-semibold">{money(r.actualMinor)}</span>
                      <span className="text-muted-foreground"> / {money(r.plannedMinor)}</span>
                    </div>
                  </div>
                  {r.budgeted && (
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div className={`h-full ${over ? "bg-red-500" : "bg-primary"}`} style={{ width: `${pct}%` }} />
                    </div>
                  )}
                  <div className="mt-1 text-xs text-muted-foreground">
                    {over ? `Over by ${money(-r.varianceMinor)}` : `${money(r.varianceMinor)} remaining`}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / update a category budget */}
      <div className="rounded-lg border border-border p-4">
        <h2 className="mb-3 flex items-center gap-2 font-semibold">
          <Plus className="h-4 w-4" /> Set a category budget
        </h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="cat">Category</Label>
            <Input id="cat" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Structural, Plumbing" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="planned">Planned amount (₹)</Label>
            <Input id="planned" type="number" value={planned} onChange={(e) => setPlanned(e.target.value)} />
          </div>
          <Button onClick={() => setBudget(category, Number(planned))} disabled={busy || !category || !planned}>
            Save budget
          </Button>
        </div>
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      </div>
    </div>
  );
}

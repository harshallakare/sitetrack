"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { adminClientFetch } from "@/lib/admin-client-api";

interface Plan {
  slug: string;
  name: string;
}

export function PlanSelector({
  organizationId,
  currentSlug,
  plans,
}: {
  organizationId: string;
  currentSlug: string;
  plans: Plan[];
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onChange(slug: string) {
    if (slug === currentSlug) return;
    setBusy(true);
    setError(null);
    try {
      await adminClientFetch(`/admin/organizations/${organizationId}/plan`, {
        method: "PUT",
        body: JSON.stringify({ planSlug: slug }),
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update plan");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <select
        className="h-9 rounded-md border border-border bg-transparent px-2 text-sm"
        value={currentSlug}
        disabled={busy}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Plan"
      >
        {plans.map((p) => (
          <option key={p.slug} value={p.slug}>
            {p.name}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

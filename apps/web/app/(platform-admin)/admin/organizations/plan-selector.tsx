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

  async function onChange(slug: string) {
    if (slug === currentSlug) return;
    setBusy(true);
    try {
      await adminClientFetch(`/admin/organizations/${organizationId}/plan`, {
        method: "PUT",
        body: JSON.stringify({ planSlug: slug }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
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
  );
}

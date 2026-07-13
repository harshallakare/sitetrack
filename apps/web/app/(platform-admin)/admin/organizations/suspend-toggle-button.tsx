"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Ban, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminClientFetch as clientFetch } from "@/lib/admin-client-api";

export function SuspendToggleButton({ organizationId, isActive }: { organizationId: string; isActive: boolean }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function handleToggle() {
    const confirmed = window.confirm(
      isActive
        ? "Suspend this organization? Every member will immediately lose access, including anyone currently logged in."
        : "Reactivate this organization? Members will regain access immediately."
    );
    if (!confirmed) return;

    setPending(true);
    try {
      await clientFetch(`/admin/organizations/${organizationId}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !isActive }),
      });
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Button variant={isActive ? "destructive" : "default"} size="sm" onClick={handleToggle} disabled={pending}>
      {isActive ? <Ban className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
      {pending ? "Working..." : isActive ? "Suspend" : "Reactivate"}
    </Button>
  );
}

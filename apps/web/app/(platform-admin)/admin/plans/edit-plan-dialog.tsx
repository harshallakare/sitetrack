"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { adminClientFetch } from "@/lib/admin-client-api";

interface EditPlanDialogProps {
  slug: string;
  initialName: string;
  initialPriceMonthlyMinor: number;
}

// Marketing/checkout price is stored in minor units (paise); the form works
// in whole rupees since nobody wants to type "99900" to mean ₹999.
export function EditPlanDialog({ slug, initialName, initialPriceMonthlyMinor }: EditPlanDialogProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState(initialName);
  const [priceRupees, setPriceRupees] = React.useState(String(initialPriceMonthlyMinor / 100));
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function onOpenChange(next: boolean) {
    if (next) {
      setName(initialName);
      setPriceRupees(String(initialPriceMonthlyMinor / 100));
      setError(null);
    }
    setOpen(next);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const priceMonthlyMinor = Math.round(Number(priceRupees) * 100);
      await adminClientFetch(`/admin/plans/${slug}`, {
        method: "PATCH",
        body: JSON.stringify({ name, priceMonthlyMinor }),
      });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update plan");
    } finally {
      setBusy(false);
    }
  }

  const priceValid = priceRupees !== "" && Number.isFinite(Number(priceRupees)) && Number(priceRupees) >= 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Pencil className="h-4 w-4" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Plan</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Changing the price only affects new checkouts -- customers already subscribed keep their current billing
            amount until they cancel and resubscribe.
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-plan-name">Plan Name</Label>
            <Input id="edit-plan-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-plan-price">Monthly Price (₹)</Label>
            <Input
              id="edit-plan-price"
              type="number"
              min="0"
              step="1"
              value={priceRupees}
              onChange={(e) => setPriceRupees(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="submit" disabled={busy || !name || !priceValid}>
              {busy ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

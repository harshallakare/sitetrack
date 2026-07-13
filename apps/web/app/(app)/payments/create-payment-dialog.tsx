"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createPaymentSchema, type CreatePaymentInput } from "@sitetrack/shared-types";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { clientFetch } from "@/lib/client-api";

interface Option {
  id: string;
  label: string;
}

export function CreatePaymentDialog({ sites, accounts, vendors }: { sites: Option[]; accounts: Option[]; vendors: Option[] }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreatePaymentInput>({ resolver: zodResolver(createPaymentSchema) });

  async function onSubmit(values: CreatePaymentInput) {
    setServerError(null);
    try {
      await clientFetch("/payments", {
        method: "POST",
        body: JSON.stringify({ ...values, idempotencyKey: crypto.randomUUID() }),
      });
      reset();
      setOpen(false);
      router.refresh();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Failed to record payment");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> Record Payment
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="siteId">Site</Label>
            <select id="siteId" className="flex h-10 w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm" {...register("siteId")}>
              <option value="">Select a site</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            {errors.siteId && <p className="text-sm text-red-500">{errors.siteId.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="vendorId">Vendor</Label>
            <select id="vendorId" className="flex h-10 w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm" {...register("vendorId")}>
              <option value="">Select a vendor</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
            {errors.vendorId && <p className="text-sm text-red-500">{errors.vendorId.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="accountId">From Account</Label>
            <select id="accountId" className="flex h-10 w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm" {...register("accountId")}>
              <option value="">Select an account</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
            {errors.accountId && <p className="text-sm text-red-500">{errors.accountId.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="amount">Amount</Label>
              <Input id="amount" type="number" step="any" {...register("amount")} />
              {errors.amount && <p className="text-sm text-red-500">{errors.amount.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="paymentDate">Payment Date</Label>
              <Input id="paymentDate" type="date" {...register("paymentDate")} />
              {errors.paymentDate && <p className="text-sm text-red-500">{errors.paymentDate.message}</p>}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" {...register("notes")} />
          </div>
          {serverError && <p className="text-sm text-red-500">{serverError}</p>}
          <div className="flex justify-end gap-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Payment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

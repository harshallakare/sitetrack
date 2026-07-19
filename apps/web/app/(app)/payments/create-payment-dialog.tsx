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
import { usePreferences } from "@/components/providers/preferences-provider";

interface Option {
  id: string;
  label: string;
}

export function CreatePaymentDialog({ sites, accounts, vendors }: { sites: Option[]; accounts: Option[]; vendors: Option[] }) {
  const router = useRouter();
  const { t } = usePreferences();
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
      setServerError(err instanceof Error ? err.message : t("payments.form.saveFailed"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> {t("payments.recordPayment")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("payments.recordPayment")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="siteId">{t("common.site")}</Label>
            <select id="siteId" className="flex h-10 w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm" {...register("siteId")}>
              <option value="">{t("common.selectSite")}</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            {errors.siteId && <p className="text-sm text-red-500">{errors.siteId.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="vendorId">{t("common.vendor")}</Label>
            <select id="vendorId" className="flex h-10 w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm" {...register("vendorId")}>
              <option value="">{t("common.selectVendor")}</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
            {errors.vendorId && <p className="text-sm text-red-500">{errors.vendorId.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="accountId">{t("payments.form.fromAccount")}</Label>
            <select id="accountId" className="flex h-10 w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm" {...register("accountId")}>
              <option value="">{t("common.selectAccount")}</option>
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
              <Label htmlFor="amount">{t("common.amount")}</Label>
              <Input id="amount" type="number" step="any" {...register("amount")} />
              {errors.amount && <p className="text-sm text-red-500">{errors.amount.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="paymentDate">{t("payments.form.paymentDate")}</Label>
              <Input id="paymentDate" type="date" {...register("paymentDate")} />
              {errors.paymentDate && <p className="text-sm text-red-500">{errors.paymentDate.message}</p>}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">{t("common.notes")}</Label>
            <Textarea id="notes" {...register("notes")} />
          </div>
          {serverError && <p className="text-sm text-red-500">{serverError}</p>}
          <div className="flex justify-end gap-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t("common.saving") : t("payments.form.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

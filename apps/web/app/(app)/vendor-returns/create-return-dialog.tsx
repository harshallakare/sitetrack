"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createVendorReturnSchema, type CreateVendorReturnInput } from "@sitetrack/shared-types";
import { Plus, Trash2 } from "lucide-react";
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

export function CreateReturnDialog({
  sites,
  vendors,
  items,
}: {
  sites: Option[];
  vendors: Option[];
  items: Option[];
}) {
  const router = useRouter();
  const { t } = usePreferences();
  const [open, setOpen] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateVendorReturnInput>({
    resolver: zodResolver(createVendorReturnSchema),
    defaultValues: {
      lineItems: [{ itemId: "", quantity: 1, unitPrice: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "lineItems" });

  async function onSubmit(values: CreateVendorReturnInput) {
    setServerError(null);
    try {
      await clientFetch("/vendor-returns", { method: "POST", body: JSON.stringify(values) });
      reset({ lineItems: [{ itemId: "", quantity: 1, unitPrice: 0 }] });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : t("returns.form.saveFailed"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> {t("returns.createReturn")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("returns.createReturn")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="returnDate">{t("returns.form.returnDate")}</Label>
              <Input id="returnDate" type="date" {...register("returnDate")} />
              {errors.returnDate && <p className="text-sm text-red-500">{errors.returnDate.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reason">{t("returns.form.reason")}</Label>
              <Input id="reason" placeholder={t("returns.form.reasonPlaceholder")} {...register("reason")} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">{t("common.notes")}</Label>
            <Textarea id="notes" {...register("notes")} />
          </div>

          <div className="flex flex-col gap-2">
            <Label>{t("deliveries.form.lineItems")}</Label>
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-[1fr_80px_100px_36px] items-start gap-2">
                <select
                  className="flex h-10 w-full rounded-md border border-border bg-transparent px-2 py-2 text-sm"
                  {...register(`lineItems.${index}.itemId` as const)}
                >
                  <option value="">{t("common.item")}</option>
                  {items.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.label}
                    </option>
                  ))}
                </select>
                <Input
                  type="number"
                  step="any"
                  placeholder={t("deliveries.form.qty")}
                  {...register(`lineItems.${index}.quantity` as const)}
                />
                <Input
                  type="number"
                  step="any"
                  placeholder={t("deliveries.form.price")}
                  {...register(`lineItems.${index}.unitPrice` as const)}
                />
                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length === 1}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {errors.lineItems && <p className="text-sm text-red-500">{errors.lineItems.message as string}</p>}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start"
              onClick={() => append({ itemId: "", quantity: 1, unitPrice: 0 })}
            >
              <Plus className="h-4 w-4" /> {t("deliveries.form.addLine")}
            </Button>
          </div>

          {serverError && <p className="text-sm text-red-500">{serverError}</p>}
          <div className="flex justify-end gap-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t("common.saving") : t("common.create")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

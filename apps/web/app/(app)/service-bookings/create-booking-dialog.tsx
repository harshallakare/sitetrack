"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createServiceBookingSchema, toMinorUnits, type CreateServiceBookingInput } from "@sitetrack/shared-types";
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

interface BookingFormValues {
  siteId: string;
  serviceId: string;
  vendorId: string;
  bookingDate: string;
  quantity: number;
  rate: string;
  notes?: string;
}

export function CreateBookingDialog({
  sites,
  services,
  vendors,
}: {
  sites: Option[];
  services: Option[];
  vendors: Option[];
}) {
  const router = useRouter();
  const { t } = usePreferences();
  const [open, setOpen] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BookingFormValues>({ defaultValues: { quantity: 1 } });

  async function onSubmit(values: BookingFormValues) {
    setServerError(null);
    try {
      const payload: CreateServiceBookingInput = createServiceBookingSchema.parse({
        siteId: values.siteId,
        serviceId: values.serviceId,
        vendorId: values.vendorId || undefined,
        bookingDate: values.bookingDate,
        quantity: Number(values.quantity),
        rateMinor: toMinorUnits(Number(values.rate)),
        notes: values.notes || undefined,
      });
      await clientFetch("/service-bookings", { method: "POST", body: JSON.stringify(payload) });
      reset({ quantity: 1 });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : t("bookings.form.saveFailed"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> {t("bookings.bookService")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("bookings.bookService")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="siteId">{t("common.site")}</Label>
              <select
                id="siteId"
                className="flex h-10 w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm"
                {...register("siteId", { required: true })}
              >
                <option value="">{t("common.selectSite")}</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
              {errors.siteId && <p className="text-sm text-red-500">{t("common.required")}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="serviceId">{t("bookings.form.service")}</Label>
              <select
                id="serviceId"
                className="flex h-10 w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm"
                {...register("serviceId", { required: true })}
              >
                <option value="">{t("bookings.form.selectService")}</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
              {errors.serviceId && <p className="text-sm text-red-500">{t("common.required")}</p>}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="vendorId">{t("bookings.form.provider")}</Label>
            <select
              id="vendorId"
              className="flex h-10 w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm"
              {...register("vendorId")}
            >
              <option value="">{t("bookings.form.noProvider")}</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bookingDate">{t("bookings.form.bookingDate")}</Label>
              <Input id="bookingDate" type="date" {...register("bookingDate", { required: true })} />
              {errors.bookingDate && <p className="text-sm text-red-500">{t("common.required")}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="quantity">{t("deliveries.form.qty")}</Label>
              <Input id="quantity" type="number" step="any" {...register("quantity", { required: true, valueAsNumber: true })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rate">{t("bookings.form.rate")}</Label>
              <Input id="rate" type="number" step="any" {...register("rate", { required: true })} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">{t("common.notes")}</Label>
            <Textarea id="notes" {...register("notes")} />
          </div>

          {serverError && <p className="text-sm text-red-500">{serverError}</p>}
          <div className="flex justify-end gap-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t("common.creating") : t("common.create")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

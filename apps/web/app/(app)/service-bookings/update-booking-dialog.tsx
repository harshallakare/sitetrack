"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { SERVICE_BOOKING_STATUSES } from "@sitetrack/shared-types";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { clientFetch } from "@/lib/client-api";
import { usePreferences } from "@/components/providers/preferences-provider";

interface UpdatableBooking {
  id: string;
  status: string;
  progressPercent: number;
}

interface StatusFormValues {
  status: string;
  progressPercent: number;
}

export function UpdateBookingDialog({ booking }: { booking: UpdatableBooking }) {
  const router = useRouter();
  const { t } = usePreferences();
  const [open, setOpen] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<StatusFormValues>({
    defaultValues: { status: booking.status, progressPercent: booking.progressPercent },
  });

  function onOpenChange(next: boolean) {
    if (next) {
      reset({ status: booking.status, progressPercent: booking.progressPercent });
      setServerError(null);
    }
    setOpen(next);
  }

  async function onSubmit(values: StatusFormValues) {
    setServerError(null);
    try {
      await clientFetch(`/service-bookings/${booking.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: values.status, progressPercent: Number(values.progressPercent) }),
      });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : t("bookings.form.saveFailed"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <button
          aria-label={t("bookings.updateStatus")}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Pencil className="h-4 w-4" />
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("bookings.updateStatus")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="status">{t("bookings.form.status")}</Label>
            <select
              id="status"
              className="flex h-10 w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm"
              {...register("status")}
            >
              {SERVICE_BOOKING_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="progressPercent">{t("bookings.form.progress")}</Label>
            <Input id="progressPercent" type="number" min={0} max={100} {...register("progressPercent", { valueAsNumber: true })} />
          </div>
          {serverError && <p className="text-sm text-red-500">{serverError}</p>}
          <div className="flex justify-end gap-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t("common.saving") : t("common.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { VENDOR_RETURN_STATUSES } from "@sitetrack/shared-types";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { clientFetch } from "@/lib/client-api";
import { usePreferences } from "@/components/providers/preferences-provider";

interface UpdatableReturn {
  id: string;
  status: string;
}

interface StatusFormValues {
  status: string;
}

export function UpdateReturnDialog({ vendorReturn }: { vendorReturn: UpdatableReturn }) {
  const router = useRouter();
  const { t } = usePreferences();
  const [open, setOpen] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<StatusFormValues>({ defaultValues: { status: vendorReturn.status } });

  function onOpenChange(next: boolean) {
    if (next) {
      reset({ status: vendorReturn.status });
      setServerError(null);
    }
    setOpen(next);
  }

  async function onSubmit(values: StatusFormValues) {
    setServerError(null);
    try {
      await clientFetch(`/vendor-returns/${vendorReturn.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: values.status }),
      });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : t("returns.form.saveFailed"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <button
          aria-label={t("returns.updateStatus")}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Pencil className="h-4 w-4" />
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("returns.updateStatus")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="status">{t("returns.form.status")}</Label>
            <select
              id="status"
              className="flex h-10 w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm"
              {...register("status")}
            >
              {VENDOR_RETURN_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
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

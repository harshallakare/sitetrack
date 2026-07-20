"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { unitOfMeasureSchema, UNITS_OF_MEASURE, toMinorUnits } from "@sitetrack/shared-types";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { clientFetch } from "@/lib/client-api";
import { usePreferences } from "@/components/providers/preferences-provider";

const serviceFormSchema = z.object({
  name: z.string().min(1).max(160),
  unitOfMeasure: unitOfMeasureSchema,
  category: z.string().max(80).optional(),
  standardRate: z.string().optional(),
  description: z.string().max(400).optional(),
});
type ServiceFormValues = z.infer<typeof serviceFormSchema>;

export function CreateServiceDialog() {
  const router = useRouter();
  const { t } = usePreferences();
  const [open, setOpen] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
  });

  async function onSubmit(values: ServiceFormValues) {
    setServerError(null);
    try {
      const { standardRate, ...rest } = values;
      await clientFetch("/services", {
        method: "POST",
        body: JSON.stringify({
          ...rest,
          standardRateMinor: standardRate ? toMinorUnits(Number(standardRate)) : undefined,
        }),
      });
      reset();
      setOpen(false);
      router.refresh();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : t("services.form.createFailed"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> {t("services.addService")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("services.addService")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">{t("services.form.name")}</Label>
            <Input id="name" {...register("name")} />
            {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="unitOfMeasure">{t("services.form.unit")}</Label>
            <select
              id="unitOfMeasure"
              className="flex h-10 w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm"
              {...register("unitOfMeasure")}
            >
              <option value="">{t("items.form.selectUnit")}</option>
              {UNITS_OF_MEASURE.map((unit) => (
                <option key={unit} value={unit}>
                  {unit.replace("_", " ")}
                </option>
              ))}
            </select>
            {errors.unitOfMeasure && <p className="text-sm text-red-500">{errors.unitOfMeasure.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="category">{t("common.category")}</Label>
            <Input id="category" {...register("category")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="standardRate">{t("services.form.standardRate")}</Label>
            <Input id="standardRate" type="number" step="any" {...register("standardRate")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">{t("common.description")}</Label>
            <Textarea id="description" {...register("description")} />
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

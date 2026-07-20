"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { unitOfMeasureSchema, UNITS_OF_MEASURE, toMinorUnits, fromMinorUnits } from "@sitetrack/shared-types";
import { Pencil } from "lucide-react";
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

interface EditableService {
  id: string;
  name: string;
  unitOfMeasure: string;
  category: string | null;
  standardRateMinor: number | null;
  description: string | null;
}

function defaultsFor(service: EditableService): ServiceFormValues {
  return {
    name: service.name,
    unitOfMeasure: service.unitOfMeasure as ServiceFormValues["unitOfMeasure"],
    category: service.category ?? "",
    standardRate: service.standardRateMinor != null ? String(fromMinorUnits(service.standardRateMinor)) : "",
    description: service.description ?? "",
  };
}

export function EditServiceDialog({ service }: { service: EditableService }) {
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
    defaultValues: defaultsFor(service),
  });

  function onOpenChange(next: boolean) {
    if (next) {
      reset(defaultsFor(service));
      setServerError(null);
    }
    setOpen(next);
  }

  async function onSubmit(values: ServiceFormValues) {
    setServerError(null);
    try {
      const { standardRate, ...rest } = values;
      await clientFetch(`/services/${service.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...rest,
          standardRateMinor: standardRate ? toMinorUnits(Number(standardRate)) : undefined,
        }),
      });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : t("services.form.updateFailed"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <button
          aria-label={t("common.edit")}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Pencil className="h-4 w-4" />
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("services.editService")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-name">{t("services.form.name")}</Label>
            <Input id="edit-name" {...register("name")} />
            {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-unitOfMeasure">{t("services.form.unit")}</Label>
            <select
              id="edit-unitOfMeasure"
              className="flex h-10 w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm"
              {...register("unitOfMeasure")}
            >
              {UNITS_OF_MEASURE.map((unit) => (
                <option key={unit} value={unit}>
                  {unit.replace("_", " ")}
                </option>
              ))}
            </select>
            {errors.unitOfMeasure && <p className="text-sm text-red-500">{errors.unitOfMeasure.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-category">{t("common.category")}</Label>
            <Input id="edit-category" {...register("category")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-standardRate">{t("services.form.standardRate")}</Label>
            <Input id="edit-standardRate" type="number" step="any" {...register("standardRate")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-description">{t("common.description")}</Label>
            <Textarea id="edit-description" {...register("description")} />
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

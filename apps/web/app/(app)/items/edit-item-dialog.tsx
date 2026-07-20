"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateItemSchema, UNITS_OF_MEASURE, type UpdateItemInput } from "@sitetrack/shared-types";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { clientFetch } from "@/lib/client-api";
import { usePreferences } from "@/components/providers/preferences-provider";

interface EditableItem {
  id: string;
  name: string;
  unitOfMeasure: string;
  category: string | null;
  description: string | null;
}

export function EditItemDialog({ item }: { item: EditableItem }) {
  const router = useRouter();
  const { t } = usePreferences();
  const [open, setOpen] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UpdateItemInput>({
    resolver: zodResolver(updateItemSchema),
    defaultValues: {
      name: item.name,
      unitOfMeasure: item.unitOfMeasure as UpdateItemInput["unitOfMeasure"],
      category: item.category ?? "",
      description: item.description ?? "",
    },
  });

  function onOpenChange(next: boolean) {
    if (next) {
      reset({
        name: item.name,
        unitOfMeasure: item.unitOfMeasure as UpdateItemInput["unitOfMeasure"],
        category: item.category ?? "",
        description: item.description ?? "",
      });
      setServerError(null);
    }
    setOpen(next);
  }

  async function onSubmit(values: UpdateItemInput) {
    setServerError(null);
    try {
      await clientFetch(`/items/${item.id}`, { method: "PATCH", body: JSON.stringify(values) });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : t("items.form.updateFailed"));
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
          <DialogTitle>{t("items.editItem")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-name">{t("items.form.name")}</Label>
            <Input id="edit-name" {...register("name")} />
            {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-unitOfMeasure">{t("items.form.unit")}</Label>
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

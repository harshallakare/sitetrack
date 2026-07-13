"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createItemSchema, UNITS_OF_MEASURE, type CreateItemInput } from "@sitetrack/shared-types";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { clientFetch } from "@/lib/client-api";

export function CreateItemDialog() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateItemInput>({ resolver: zodResolver(createItemSchema) });

  async function onSubmit(values: CreateItemInput) {
    setServerError(null);
    try {
      await clientFetch("/items", { method: "POST", body: JSON.stringify(values) });
      reset();
      setOpen(false);
      router.refresh();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Failed to create item");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> Add Item
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Item Name</Label>
            <Input id="name" {...register("name")} />
            {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="unitOfMeasure">Unit of Measure</Label>
            <select
              id="unitOfMeasure"
              className="flex h-10 w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm"
              {...register("unitOfMeasure")}
            >
              <option value="">Select unit</option>
              {UNITS_OF_MEASURE.map((unit) => (
                <option key={unit} value={unit}>
                  {unit.replace("_", " ")}
                </option>
              ))}
            </select>
            {errors.unitOfMeasure && <p className="text-sm text-red-500">{errors.unitOfMeasure.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="category">Category</Label>
            <Input id="category" {...register("category")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register("description")} />
          </div>
          {serverError && <p className="text-sm text-red-500">{serverError}</p>}
          <div className="flex justify-end gap-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

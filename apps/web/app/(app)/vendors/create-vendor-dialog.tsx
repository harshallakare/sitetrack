"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createVendorSchema, type CreateVendorInput } from "@sitetrack/shared-types";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { clientFetch } from "@/lib/client-api";

export function CreateVendorDialog() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [tagsText, setTagsText] = React.useState("");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateVendorInput>({ resolver: zodResolver(createVendorSchema) });

  async function onSubmit(values: CreateVendorInput) {
    setServerError(null);
    try {
      const tagNames = tagsText
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      await clientFetch("/vendors", { method: "POST", body: JSON.stringify({ ...values, tagNames }) });
      reset();
      setTagsText("");
      setOpen(false);
      router.refresh();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Failed to create vendor");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> Add Vendor
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Vendor</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contactPerson">Contact Person</Label>
            <Input id="contactPerson" {...register("contactPerson")} />
            {errors.contactPerson && <p className="text-sm text-red-500">{errors.contactPerson.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="companyName">Company Name (Optional)</Label>
            <Input id="companyName" {...register("companyName")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="paymentDetails">Payment Details</Label>
            <Textarea id="paymentDetails" placeholder="Bank details, UPI ID, or payment instructions" {...register("paymentDetails")} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...register("phone")} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="address">Address</Label>
            <Textarea id="address" {...register("address")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tags">Vendor Tags (comma separated)</Label>
            <Input id="tags" value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="cement, trusted" />
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

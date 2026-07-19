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
import { usePreferences } from "@/components/providers/preferences-provider";

export function CreateVendorDialog() {
  const router = useRouter();
  const { t } = usePreferences();
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
        .map((tag) => tag.trim())
        .filter(Boolean);
      await clientFetch("/vendors", { method: "POST", body: JSON.stringify({ ...values, tagNames }) });
      reset();
      setTagsText("");
      setOpen(false);
      router.refresh();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : t("vendors.form.createFailed"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> {t("vendors.addVendor")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("vendors.addVendor")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contactPerson">{t("vendors.form.contactPerson")}</Label>
            <Input id="contactPerson" {...register("contactPerson")} />
            {errors.contactPerson && <p className="text-sm text-red-500">{errors.contactPerson.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="companyName">{t("vendors.form.companyName")} {t("common.optional")}</Label>
            <Input id="companyName" {...register("companyName")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="paymentDetails">{t("vendors.form.paymentDetails")}</Label>
            <Textarea id="paymentDetails" placeholder={t("vendors.form.paymentDetailsPlaceholder")} {...register("paymentDetails")} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">{t("common.email")}</Label>
              <Input id="email" type="email" {...register("email")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">{t("vendors.colPhone")}</Label>
              <Input id="phone" {...register("phone")} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="address">{t("sites.form.address")}</Label>
            <Textarea id="address" {...register("address")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tags">{t("vendors.form.tags")}</Label>
            <Input id="tags" value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder={t("vendors.form.tagsPlaceholder")} />
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

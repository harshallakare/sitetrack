"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateVendorSchema, type UpdateVendorInput } from "@sitetrack/shared-types";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { clientFetch } from "@/lib/client-api";
import { usePreferences } from "@/components/providers/preferences-provider";

interface EditableVendor {
  id: string;
  contactPerson: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  paymentDetails: string | null;
  tags: Array<{ tag: { id: string; name: string } }>;
}

function defaultsFor(vendor: EditableVendor): UpdateVendorInput {
  return {
    contactPerson: vendor.contactPerson,
    companyName: vendor.companyName ?? "",
    email: vendor.email ?? "",
    phone: vendor.phone ?? "",
    address: vendor.address ?? "",
    paymentDetails: vendor.paymentDetails ?? "",
  };
}

export function EditVendorDialog({ vendor }: { vendor: EditableVendor }) {
  const router = useRouter();
  const { t } = usePreferences();
  const [open, setOpen] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [tagsText, setTagsText] = React.useState(vendor.tags.map((t) => t.tag.name).join(", "));
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UpdateVendorInput>({
    resolver: zodResolver(updateVendorSchema),
    defaultValues: defaultsFor(vendor),
  });

  function onOpenChange(next: boolean) {
    if (next) {
      reset(defaultsFor(vendor));
      setTagsText(vendor.tags.map((t) => t.tag.name).join(", "));
      setServerError(null);
    }
    setOpen(next);
  }

  async function onSubmit(values: UpdateVendorInput) {
    setServerError(null);
    try {
      const tagNames = tagsText
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);
      await clientFetch(`/vendors/${vendor.id}`, {
        method: "PATCH",
        body: JSON.stringify({ ...values, tagNames }),
      });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : t("vendors.form.updateFailed"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <button
          aria-label={t("common.edit")}
          className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Pencil className="h-4 w-4" />
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("vendors.editVendor")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-contactPerson">{t("vendors.form.contactPerson")}</Label>
            <Input id="edit-contactPerson" {...register("contactPerson")} />
            {errors.contactPerson && <p className="text-sm text-red-500">{errors.contactPerson.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-companyName">{t("vendors.form.companyName")} {t("common.optional")}</Label>
            <Input id="edit-companyName" {...register("companyName")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-paymentDetails">{t("vendors.form.paymentDetails")}</Label>
            <Textarea id="edit-paymentDetails" placeholder={t("vendors.form.paymentDetailsPlaceholder")} {...register("paymentDetails")} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-email">{t("common.email")}</Label>
              <Input id="edit-email" type="email" {...register("email")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-phone">{t("vendors.colPhone")}</Label>
              <Input id="edit-phone" {...register("phone")} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-address">{t("sites.form.address")}</Label>
            <Textarea id="edit-address" {...register("address")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-tags">{t("vendors.form.tags")}</Label>
            <Input id="edit-tags" value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder={t("vendors.form.tagsPlaceholder")} />
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

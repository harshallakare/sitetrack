"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { adminClientFetch } from "@/lib/admin-client-api";

export function CreateOrganizationDialog() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [organizationName, setOrganizationName] = React.useState("");
  const [ownerName, setOwnerName] = React.useState("");
  const [ownerEmail, setOwnerEmail] = React.useState("");
  const [ownerPassword, setOwnerPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function onOpenChange(next: boolean) {
    if (next) {
      setOrganizationName("");
      setOwnerName("");
      setOwnerEmail("");
      setOwnerPassword("");
      setError(null);
    }
    setOpen(next);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await adminClientFetch("/admin/organizations", {
        method: "POST",
        body: JSON.stringify({ organizationName, ownerName, ownerEmail, ownerPassword }),
      });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create organization");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          New Organization
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Onboard a New Customer</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Creates a brand-new organization with its own owner account -- the owner email must not already have an
            account.
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="create-org-name">Organization Name</Label>
            <Input
              id="create-org-name"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="create-org-owner-name">Owner Name</Label>
            <Input id="create-org-owner-name" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="create-org-owner-email">Owner Email</Label>
            <Input
              id="create-org-owner-email"
              type="email"
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="create-org-owner-password">Owner Password</Label>
            <PasswordInput
              id="create-org-owner-password"
              value={ownerPassword}
              onChange={(e) => setOwnerPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button
              type="submit"
              disabled={busy || !organizationName || !ownerName || !ownerEmail || ownerPassword.length < 8}
            >
              {busy ? "Creating..." : "Create Organization"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

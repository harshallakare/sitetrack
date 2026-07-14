"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { adminClientFetch } from "@/lib/admin-client-api";

export function CreateAdminForm() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleCreate() {
    setBusy(true);
    setError(null);
    try {
      await adminClientFetch("/admin/admins", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });
      setName("");
      setEmail("");
      setPassword("");
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create admin");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        <UserPlus className="mr-1.5 h-4 w-4" />
        New Admin
      </Button>
    );
  }

  return (
    <section className="rounded-lg border border-border p-4">
      <h2 className="mb-1 font-semibold">Create platform admin</h2>
      <p className="mb-3 text-sm text-muted-foreground">
        A dedicated admin account, separate from any customer login. It must use an email that isn&apos;t already
        registered.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Email</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Password</Label>
          <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      <div className="mt-3 flex gap-2">
        <Button size="sm" onClick={handleCreate} disabled={busy || !name || !email || password.length < 8}>
          {busy ? "Creating…" : "Create admin"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
          Cancel
        </Button>
      </div>
    </section>
  );
}

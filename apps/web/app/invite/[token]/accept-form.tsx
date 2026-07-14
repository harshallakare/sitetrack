"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";

export function AcceptInviteForm({
  token,
  requiresAccountSetup,
}: {
  token: string;
  requiresAccountSetup: boolean;
}) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  async function handleAccept() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          ...(requiresAccountSetup ? { name, password } : {}),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "Failed to accept" }));
        setError(body.message ?? "Failed to accept invitation");
        return;
      }
      setDone(true);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="flex flex-col gap-3 text-center">
        <p className="text-sm text-green-600">You&apos;ve joined the organization.</p>
        <Button onClick={() => router.push("/login")}>Go to sign in</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {requiresAccountSetup && (
        <>
          <p className="text-sm text-muted-foreground">Create your account to accept this invitation.</p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Your name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
            <PasswordInput id="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
        </>
      )}
      {!requiresAccountSetup && (
        <p className="text-sm text-muted-foreground">
          This email already has an account. Accept to add this organization to it.
        </p>
      )}
      {error && <p className="text-sm text-red-500">{error}</p>}
      <Button onClick={handleAccept} disabled={busy || (requiresAccountSetup && (!name || password.length < 8))}>
        {busy ? "Joining..." : "Accept invitation"}
      </Button>
    </div>
  );
}

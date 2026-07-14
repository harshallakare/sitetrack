"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ResetPasswordPage() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "Reset failed" }));
        setError(body.message ?? "This reset link is invalid or expired.");
        return;
      }
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Choose a new password</CardTitle>
          <CardDescription>Enter a new password for your account.</CardDescription>
        </CardHeader>
        <CardContent>
          {!token ? (
            <p className="text-sm text-red-500">Missing reset token. Use the link from your email.</p>
          ) : done ? (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-green-600">Your password has been reset.</p>
              <Button onClick={() => router.push("/login")}>Go to sign in</Button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">New password</Label>
                <PasswordInput
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
                <p className="text-xs text-muted-foreground">At least 8 characters.</p>
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" disabled={submitting || password.length < 8}>
                {submitting ? "Resetting..." : "Reset password"}
              </Button>
              <Link href="/login" className="text-center text-sm text-primary underline-offset-4 hover:underline">
                Back to sign in
              </Link>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

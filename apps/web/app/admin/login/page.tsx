"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@sitetrack/shared-types";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Deliberately standalone: no shared layout with the tenant (auth)/login
// page or the protected (platform-admin)/admin layout (which would redirect
// away before this form could even render, since it requires an existing
// admin session -- this page is how you get one in the first place).
export default function AdminLoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginInput) {
    setServerError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) {
        setServerError(data.message ?? "Sign in failed");
        return;
      }
      router.push("/admin");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 p-4">
      <Card className="w-full max-w-sm border-red-900/30 bg-neutral-900 text-neutral-100">
        <CardHeader>
          <div className="mb-1 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-red-400" />
            <CardTitle className="text-2xl text-neutral-100">Platform Admin</CardTitle>
          </div>
          <CardDescription className="text-neutral-400">
            Separate sign-in for platform operators. This is not the customer login.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email" className="text-neutral-200">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                className="border-neutral-700 bg-neutral-800 text-neutral-100"
                {...register("email")}
              />
              {errors.email && <p className="text-sm text-red-400">{errors.email.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password" className="text-neutral-200">
                Password
              </Label>
              <PasswordInput
                id="password"
                autoComplete="current-password"
                className="border-neutral-700 bg-neutral-800 text-neutral-100"
                {...register("password")}
              />
              {errors.password && <p className="text-sm text-red-400">{errors.password.message}</p>}
            </div>
            {serverError && <p className="text-sm text-red-400">{serverError}</p>}
            <Button type="submit" disabled={submitting} variant="destructive">
              {submitting ? "Signing in..." : "Sign in as admin"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

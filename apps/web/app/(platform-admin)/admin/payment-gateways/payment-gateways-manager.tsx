"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import type { PaymentProviderDescriptor } from "@sitetrack/shared-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { adminClientFetch } from "@/lib/admin-client-api";

export interface GatewayConfig {
  id: string;
  provider: string;
  mode: "TEST" | "LIVE";
  keyId: string;
  keySecretMasked: string | null;
  webhookSecretMasked: string | null;
  isActive: boolean;
  updatedAt: string;
}

export function PaymentGatewaysManager({
  registry,
  configs,
}: {
  registry: PaymentProviderDescriptor[];
  configs: GatewayConfig[];
}) {
  const configByProvider = new Map(configs.map((c) => [c.provider, c]));

  return (
    <div className="flex flex-col gap-4">
      {registry.map((descriptor) => (
        <GatewayCard
          key={descriptor.provider}
          descriptor={descriptor}
          config={configByProvider.get(descriptor.provider)}
        />
      ))}
    </div>
  );
}

function GatewayCard({
  descriptor,
  config,
}: {
  descriptor: PaymentProviderDescriptor;
  config?: GatewayConfig;
}) {
  const router = useRouter();
  const [mode, setMode] = React.useState<"TEST" | "LIVE">(config?.mode ?? "TEST");
  const [keyId, setKeyId] = React.useState(config?.keyId ?? "");
  const [keySecret, setKeySecret] = React.useState("");
  const [webhookSecret, setWebhookSecret] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = React.useState("");
  // Only Razorpay has a working checkout + webhook handler today; other
  // providers stay config-only until a driver is built for them.
  const hasCheckoutDriver = descriptor.provider === "RAZORPAY";

  React.useEffect(() => {
    if (hasCheckoutDriver) setWebhookUrl(`${window.location.origin}/webhooks/razorpay`);
  }, [hasCheckoutDriver]);

  const configured = !!config;

  async function handleSave() {
    setBusy(true);
    setError(null);
    try {
      await adminClientFetch("/admin/payment-gateways", {
        method: "PUT",
        body: JSON.stringify({
          provider: descriptor.provider,
          mode,
          keyId,
          keySecret: keySecret || undefined,
          webhookSecret: webhookSecret || undefined,
        }),
      });
      setKeySecret("");
      setWebhookSecret("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleActive() {
    setBusy(true);
    setError(null);
    try {
      await adminClientFetch(`/admin/payment-gateways/${descriptor.provider}/active`, {
        method: "POST",
        body: JSON.stringify({ isActive: !config?.isActive }),
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-lg border border-border p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold">{descriptor.label}</h2>
          {config?.isActive && (
            <span className="flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600">
              <CheckCircle2 className="h-3 w-3" /> Active
            </span>
          )}
          {configured && !config?.isActive && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Configured</span>
          )}
        </div>
        <span className="text-xs text-muted-foreground">{descriptor.docsHint}</span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label>Mode</Label>
          <select
            className="flex h-10 w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm"
            value={mode}
            onChange={(e) => setMode(e.target.value as "TEST" | "LIVE")}
          >
            <option value="TEST">Test</option>
            <option value="LIVE">Live</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{descriptor.keyIdLabel}</Label>
          <Input value={keyId} onChange={(e) => setKeyId(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{descriptor.keySecretLabel}</Label>
          <PasswordInput
            value={keySecret}
            placeholder={config?.keySecretMasked ? `Saved (${config.keySecretMasked}) — leave blank to keep` : "Not set"}
            onChange={(e) => setKeySecret(e.target.value)}
          />
        </div>
        {hasCheckoutDriver && (
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label>Webhook Secret</Label>
            <PasswordInput
              value={webhookSecret}
              placeholder={
                config?.webhookSecretMasked ? `Saved (${config.webhookSecretMasked}) — leave blank to keep` : "Not set"
              }
              onChange={(e) => setWebhookSecret(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              From the webhook you create in the {descriptor.label} dashboard, pointed at:{" "}
              <code className="rounded bg-muted px-1 py-0.5">{webhookUrl}</code>
            </p>
          </div>
        )}
      </div>

      {!hasCheckoutDriver && (
        <p className="mt-2 text-xs text-muted-foreground">
          Config only for now — self-serve checkout isn&apos;t wired up for {descriptor.label} yet.
        </p>
      )}

      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

      <div className="mt-3 flex gap-2">
        <Button size="sm" onClick={handleSave} disabled={busy || !keyId}>
          {configured ? "Update" : "Save"}
        </Button>
        {configured && (
          <Button size="sm" variant={config?.isActive ? "outline" : "default"} onClick={handleToggleActive} disabled={busy}>
            {config?.isActive ? "Deactivate" : "Activate"}
          </Button>
        )}
      </div>
    </section>
  );
}

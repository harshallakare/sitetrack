"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { adminClientFetch } from "@/lib/admin-client-api";

export interface NotificationSettings {
  emailEnabled: boolean;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpSecure: boolean;
  smtpUser: string | null;
  smtpPassMasked: string | null;
  emailFrom: string | null;
  emailFromName: string | null;
  whatsappEnabled: boolean;
  whatsappProvider: string | null;
  whatsappApiKeyMasked: string | null;
  whatsappFrom: string | null;
  smsEnabled: boolean;
  smsProvider: string | null;
  smsApiKeyMasked: string | null;
  smsApiSecretMasked: string | null;
  smsFrom: string | null;
  channelPriority: Array<"EMAIL" | "WHATSAPP" | "SMS">;
}

const CHANNEL_LABEL: Record<string, string> = { EMAIL: "Email", WHATSAPP: "WhatsApp", SMS: "SMS" };

export function NotificationSettingsForm({ initial }: { initial: NotificationSettings }) {
  const router = useRouter();
  const [s, setS] = React.useState(initial);
  const [priority, setPriority] = React.useState(initial.channelPriority);
  const [secrets, setSecrets] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [testRecipient, setTestRecipient] = React.useState("");
  const [testing, setTesting] = React.useState(false);
  const [testResult, setTestResult] = React.useState<string | null>(null);

  async function handleSendTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await adminClientFetch<{ delivered: boolean; channel?: string; attempts: Array<{ channel: string; ok: boolean; error?: string }> }>(
        "/admin/notification-settings/test",
        { method: "POST", body: JSON.stringify({ recipient: testRecipient }) }
      );
      if (res.delivered) {
        setTestResult(`Delivered via ${res.channel}. (Save your SMTP settings first for real delivery; with no SMTP host it's composed in preview mode.)`);
      } else {
        const tried = res.attempts.map((a) => `${a.channel}: ${a.error ?? "failed"}`).join("; ");
        setTestResult(`Not delivered. ${tried}`);
      }
    } catch (err) {
      setTestResult(err instanceof Error ? err.message : "Test failed");
    } finally {
      setTesting(false);
    }
  }

  function move(index: number, dir: -1 | 1) {
    const next = [...priority];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setPriority(next);
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await adminClientFetch("/admin/notification-settings", {
        method: "PUT",
        body: JSON.stringify({
          emailEnabled: s.emailEnabled,
          smtpHost: s.smtpHost ?? "",
          smtpPort: s.smtpPort ?? undefined,
          smtpSecure: s.smtpSecure,
          smtpUser: s.smtpUser ?? "",
          smtpPass: secrets.smtpPass ?? "",
          emailFrom: s.emailFrom ?? "",
          emailFromName: s.emailFromName ?? "",
          whatsappEnabled: s.whatsappEnabled,
          whatsappProvider: s.whatsappProvider ?? "",
          whatsappApiKey: secrets.whatsappApiKey ?? "",
          whatsappFrom: s.whatsappFrom ?? "",
          smsEnabled: s.smsEnabled,
          smsProvider: s.smsProvider ?? "",
          smsApiKey: secrets.smsApiKey ?? "",
          smsApiSecret: secrets.smsApiSecret ?? "",
          smsFrom: s.smsFrom ?? "",
          channelPriority: priority,
        }),
      });
      setSecrets({});
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Priority */}
      <section className="rounded-lg border border-border p-4">
        <h2 className="mb-1 font-semibold">Channel priority</h2>
        <p className="mb-3 text-sm text-muted-foreground">Notifications are attempted top-to-bottom.</p>
        <ol className="flex flex-col gap-2">
          {priority.map((ch, i) => (
            <li key={ch} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <span className="font-medium">
                {i + 1}. {CHANNEL_LABEL[ch]}
              </span>
              <span className="flex gap-1">
                <button onClick={() => move(i, -1)} disabled={i === 0} className="rounded p-1 hover:bg-muted disabled:opacity-30">
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button onClick={() => move(i, 1)} disabled={i === priority.length - 1} className="rounded p-1 hover:bg-muted disabled:opacity-30">
                  <ChevronDown className="h-4 w-4" />
                </button>
              </span>
            </li>
          ))}
        </ol>
      </section>

      {/* Email / SMTP */}
      <ChannelSection
        title="Email (SMTP)"
        enabled={s.emailEnabled}
        onToggle={(v) => setS({ ...s, emailEnabled: v })}
      >
        <Field label="SMTP Host" value={s.smtpHost ?? ""} onChange={(v) => setS({ ...s, smtpHost: v })} placeholder="smtp.example.com" />
        <Field label="SMTP Port" type="number" value={s.smtpPort?.toString() ?? ""} onChange={(v) => setS({ ...s, smtpPort: v ? Number(v) : null })} placeholder="587" />
        <div className="flex items-center gap-2">
          <input id="smtpSecure" type="checkbox" checked={s.smtpSecure} onChange={(e) => setS({ ...s, smtpSecure: e.target.checked })} />
          <Label htmlFor="smtpSecure">Use TLS/SSL</Label>
        </div>
        <Field label="SMTP Username" value={s.smtpUser ?? ""} onChange={(v) => setS({ ...s, smtpUser: v })} />
        <SecretField label="SMTP Password" masked={s.smtpPassMasked} value={secrets.smtpPass ?? ""} onChange={(v) => setSecrets({ ...secrets, smtpPass: v })} />
        <Field label="From Email" value={s.emailFrom ?? ""} onChange={(v) => setS({ ...s, emailFrom: v })} placeholder="noreply@example.com" />
        <Field label="From Name" value={s.emailFromName ?? ""} onChange={(v) => setS({ ...s, emailFromName: v })} placeholder="SiteTrack" />
      </ChannelSection>

      {/* WhatsApp */}
      <ChannelSection title="WhatsApp" enabled={s.whatsappEnabled} onToggle={(v) => setS({ ...s, whatsappEnabled: v })}>
        <Field label="Provider" value={s.whatsappProvider ?? ""} onChange={(v) => setS({ ...s, whatsappProvider: v })} placeholder="Twilio / Meta Cloud API / Gupshup" />
        <SecretField label="API Key / Token" masked={s.whatsappApiKeyMasked} value={secrets.whatsappApiKey ?? ""} onChange={(v) => setSecrets({ ...secrets, whatsappApiKey: v })} />
        <Field label="Sender Number" value={s.whatsappFrom ?? ""} onChange={(v) => setS({ ...s, whatsappFrom: v })} placeholder="+91..." />
      </ChannelSection>

      {/* SMS */}
      <ChannelSection title="SMS" enabled={s.smsEnabled} onToggle={(v) => setS({ ...s, smsEnabled: v })}>
        <Field label="Provider" value={s.smsProvider ?? ""} onChange={(v) => setS({ ...s, smsProvider: v })} placeholder="Twilio / MSG91 / TextLocal" />
        <SecretField label="API Key" masked={s.smsApiKeyMasked} value={secrets.smsApiKey ?? ""} onChange={(v) => setSecrets({ ...secrets, smsApiKey: v })} />
        <SecretField label="API Secret" masked={s.smsApiSecretMasked} value={secrets.smsApiSecret ?? ""} onChange={(v) => setSecrets({ ...secrets, smsApiSecret: v })} />
        <Field label="Sender ID" value={s.smsFrom ?? ""} onChange={(v) => setS({ ...s, smsFrom: v })} placeholder="STRACK" />
      </ChannelSection>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save settings"}
        </Button>
        {saved && <span className="text-sm text-green-600">Saved.</span>}
        {error && <span className="text-sm text-red-500">{error}</span>}
      </div>

      {/* Send a test notification through the dispatch pipeline */}
      <section className="rounded-lg border border-border p-4">
        <h2 className="mb-1 font-semibold">Send a test</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Dispatches a test notification through the enabled channels in priority order.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="testRecipient">Recipient (email / phone)</Label>
            <Input id="testRecipient" value={testRecipient} onChange={(e) => setTestRecipient(e.target.value)} placeholder="you@example.com" />
          </div>
          <Button variant="outline" onClick={handleSendTest} disabled={testing || !testRecipient}>
            {testing ? "Sending..." : "Send test"}
          </Button>
        </div>
        {testResult && <p className="mt-2 text-sm text-muted-foreground">{testResult}</p>}
      </section>
    </div>
  );
}

function ChannelSection({
  title,
  enabled,
  onToggle,
  children,
}: {
  title: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">{title}</h2>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={enabled} onChange={(e) => onToggle(e.target.checked)} />
          Enabled
        </label>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <Input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function SecretField({
  label,
  masked,
  value,
  onChange,
}: {
  label: string;
  masked: string | null;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <PasswordInput
        value={value}
        placeholder={masked ? `Saved (${masked}) — leave blank to keep` : "Not set"}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

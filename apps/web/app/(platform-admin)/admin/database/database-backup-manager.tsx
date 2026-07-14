"use client";

import * as React from "react";
import { Download, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminClientFetch } from "@/lib/admin-client-api";

const CONFIRM_PHRASE = "RESTORE";

export function DatabaseBackupManager() {
  return (
    <div className="flex flex-col gap-6">
      <BackupCard />
      <RestoreCard />
    </div>
  );
}

function BackupCard() {
  const fileName = `sitetrack-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.backup`;

  return (
    <section className="rounded-lg border border-border p-4">
      <h2 className="mb-1 font-semibold">Download backup</h2>
      <p className="mb-3 text-sm text-muted-foreground">
        Downloads an engine-native dump of the entire database straight to your browser. Nothing is stored on the
        server for this.
      </p>
      <Button asChild size="sm">
        {/* Plain link, not a fetch call -- same pattern as attachment
            downloads: the browser navigates with the admin session cookie
            already attached, and the proxy streams the response through. */}
        <a href="/api/admin-proxy/admin/database/backup" download={fileName}>
          <Download className="mr-1.5 h-4 w-4" />
          Download Backup
        </a>
      </Button>
    </section>
  );
}

function RestoreCard() {
  const [file, setFile] = React.useState<File | null>(null);
  const [confirmText, setConfirmText] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<{ message: string; preRestoreSnapshot: string } | null>(null);

  const canSubmit = !!file && confirmText === CONFIRM_PHRASE && !busy;

  async function handleRestore() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("confirm", confirmText);
      const response = await adminClientFetch<{ message: string; preRestoreSnapshot: string }>(
        "/admin/database/restore",
        { method: "POST", body: formData }
      );
      setResult(response);
      setFile(null);
      setConfirmText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Restore failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-lg border border-red-900/30 p-4">
      <div className="mb-1 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-red-500" />
        <h2 className="font-semibold">Restore from backup</h2>
      </div>
      <p className="mb-3 text-sm text-muted-foreground">
        This replaces the <strong>entire</strong> database for every organization on this deployment with the
        contents of the uploaded file — not just one organization&apos;s data. A safety snapshot of the current
        state is saved on the server automatically, immediately before this runs.
      </p>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>Backup file</Label>
          <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm file:mr-3 file:rounded-md file:border file:border-border file:bg-transparent file:px-3 file:py-1.5 file:text-sm"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>
            Type <code className="rounded bg-muted px-1 py-0.5">{CONFIRM_PHRASE}</code> to confirm
          </Label>
          <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder={CONFIRM_PHRASE} />
        </div>
        <div>
          <Button size="sm" variant="destructive" onClick={handleRestore} disabled={!canSubmit}>
            {busy ? "Restoring…" : "Restore database"}
          </Button>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      {result && (
        <div className="mt-3 rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400">
          <p>{result.message}</p>
          <p className="mt-1 text-xs text-muted-foreground">Pre-restore snapshot: {result.preRestoreSnapshot}</p>
        </div>
      )}
    </section>
  );
}

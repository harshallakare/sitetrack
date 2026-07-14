import { DatabaseBackupManager } from "./database-backup-manager";

export default function AdminDatabasePage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">Database</h1>
        <p className="text-sm text-muted-foreground">
          Back up or restore the database for this entire deployment — every organization, not just one.
        </p>
      </div>
      <DatabaseBackupManager />
    </div>
  );
}

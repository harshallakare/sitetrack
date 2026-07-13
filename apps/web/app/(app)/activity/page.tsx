import { Plus, Pencil, Trash2 } from "lucide-react";
import { serverFetch } from "@/lib/server-api";

interface ActivityEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  actorName: string;
  createdAt: string;
}

const ACTION_META: Record<string, { label: string; icon: typeof Plus; className: string }> = {
  CREATE: { label: "created", icon: Plus, className: "text-green-600 bg-green-500/10" },
  UPDATE: { label: "updated", icon: Pencil, className: "text-blue-600 bg-blue-500/10" },
  DELETE: { label: "deleted", icon: Trash2, className: "text-red-600 bg-red-500/10" },
};

export default async function ActivityPage() {
  const entries = await serverFetch<ActivityEntry[]>("/activity?limit=100");

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">Activity</h1>
        <p className="text-sm text-muted-foreground">
          Every change to vendors, items, deliveries, payments, and accounts — who did what, and when.
        </p>
      </div>

      {entries.length === 0 ? (
        <p className="rounded-lg border border-border p-8 text-center text-muted-foreground">
          No activity yet. Changes to your records will appear here.
        </p>
      ) : (
        <div className="rounded-lg border border-border divide-y divide-border">
          {entries.map((e) => {
            const meta = ACTION_META[e.action] ?? ACTION_META.UPDATE;
            const Icon = meta.icon;
            return (
              <div key={e.id} className="flex items-center gap-3 px-4 py-3">
                <span className={`rounded-md p-2 ${meta.className}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="flex-1">
                  <div className="text-sm">
                    <span className="font-medium">{e.actorName}</span> {meta.label} a{" "}
                    <span className="font-medium">{e.entityType.toLowerCase()}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{new Date(e.createdAt).toLocaleString()}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

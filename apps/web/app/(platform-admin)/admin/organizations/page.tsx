import { adminServerFetch as serverFetch } from "@/lib/admin-server-api";
import { SuspendToggleButton } from "./suspend-toggle-button";
import { PlanSelector } from "./plan-selector";
import { AddUserDialog } from "./add-user-dialog";

interface OrganizationRow {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  _count: { memberships: number; sites: number; vendors: number; deliveries: number };
  subscription: { plan: { slug: string; name: string; maxSites: number } } | null;
}
interface Plan {
  slug: string;
  name: string;
}

export default async function AdminOrganizationsPage() {
  const [organizations, plans] = await Promise.all([
    serverFetch<OrganizationRow[]>("/admin/organizations"),
    serverFetch<Plan[]>("/admin/plans"),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">Organizations</h1>
        <p className="text-sm text-muted-foreground">Every tenant on the platform</p>
      </div>

      <div className="flex flex-col gap-3">
        {organizations.map((org) => (
          <div key={org.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{org.name}</span>
                <span
                  className={
                    org.isActive
                      ? "rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600"
                      : "rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-600"
                  }
                >
                  {org.isActive ? "Active" : "Suspended"}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                {org.slug} · {org._count.memberships} members · {org._count.sites} sites · {org._count.vendors}{" "}
                vendors · {org._count.deliveries} deliveries
              </div>
              <div className="text-xs text-muted-foreground">
                Created {new Date(org.createdAt).toLocaleDateString()} · Plan:{" "}
                {org.subscription?.plan.name ?? "Free (default)"}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <AddUserDialog organizationId={org.id} />
              <PlanSelector
                organizationId={org.id}
                currentSlug={org.subscription?.plan.slug ?? "free"}
                plans={plans}
              />
              <SuspendToggleButton organizationId={org.id} isActive={org.isActive} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

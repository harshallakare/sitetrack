import { adminServerFetch as serverFetch } from "@/lib/admin-server-api";
import { EditPlanDialog } from "./edit-plan-dialog";

interface PlanRow {
  slug: string;
  name: string;
  maxSites: number;
  priceMonthlyMinor: number;
  isActive: boolean;
}

export default async function AdminPlansPage() {
  const plans = await serverFetch<PlanRow[]>("/admin/plans");

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">Plans</h1>
        <p className="text-sm text-muted-foreground">
          Edit the name and price shown at checkout and on the public pricing page.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {plans.map((plan) => (
          <div
            key={plan.slug}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{plan.name}</span>
                <span className="text-xs text-muted-foreground">({plan.slug})</span>
              </div>
              <div className="text-sm text-muted-foreground">
                ₹{(plan.priceMonthlyMinor / 100).toLocaleString("en-IN")}/month ·{" "}
                {plan.maxSites === -1 ? "Unlimited sites" : `${plan.maxSites} site${plan.maxSites === 1 ? "" : "s"}`}
              </div>
            </div>
            <EditPlanDialog slug={plan.slug} initialName={plan.name} initialPriceMonthlyMinor={plan.priceMonthlyMinor} />
          </div>
        ))}
      </div>
    </div>
  );
}

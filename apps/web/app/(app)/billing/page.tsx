import { Check } from "lucide-react";
import { serverFetch } from "@/lib/server-api";
import { fromMinorUnits } from "@sitetrack/shared-types";

interface Plan {
  id: string;
  slug: string;
  name: string;
  maxSites: number;
  priceMonthlyMinor: number;
}
interface Billing {
  currentPlan: Plan;
  usage: { sites: number; maxSites: number };
  availablePlans: Plan[];
}

function limitLabel(maxSites: number) {
  return maxSites === -1 ? "Unlimited sites" : `${maxSites} site${maxSites === 1 ? "" : "s"}`;
}
function priceLabel(minor: number) {
  return minor === 0 ? "Free" : `₹${fromMinorUnits(minor).toLocaleString("en-IN")}/mo`;
}

export default async function BillingPage() {
  const billing = await serverFetch<Billing>("/billing");
  const atLimit =
    billing.usage.maxSites !== -1 && billing.usage.sites >= billing.usage.maxSites;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Billing &amp; Plan</h1>
        <p className="text-sm text-muted-foreground">Your subscription and usage.</p>
      </div>

      {/* Current plan + usage */}
      <div className="rounded-lg border border-border p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase text-muted-foreground">Current plan</div>
            <div className="text-2xl font-bold">{billing.currentPlan.name}</div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase text-muted-foreground">Sites used</div>
            <div className={`text-2xl font-bold ${atLimit ? "text-red-600" : ""}`}>
              {billing.usage.sites}
              {billing.usage.maxSites === -1 ? "" : ` / ${billing.usage.maxSites}`}
            </div>
          </div>
        </div>
        {atLimit && (
          <p className="mt-3 rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
            You&apos;ve reached your plan&apos;s site limit. Upgrade to add more construction sites.
          </p>
        )}
      </div>

      {/* Available plans */}
      <div>
        <h2 className="mb-3 font-semibold">Plans</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {billing.availablePlans.map((plan) => {
            const isCurrent = plan.slug === billing.currentPlan.slug;
            return (
              <div
                key={plan.id}
                className={`rounded-lg border p-4 ${isCurrent ? "border-primary ring-1 ring-primary" : "border-border"}`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{plan.name}</div>
                  {isCurrent && (
                    <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      <Check className="h-3 w-3" /> Current
                    </span>
                  )}
                </div>
                <div className="mt-1 text-2xl font-bold">{priceLabel(plan.priceMonthlyMinor)}</div>
                <div className="mt-2 text-sm text-muted-foreground">{limitLabel(plan.maxSites)}</div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          To change your plan, contact your platform administrator. (Self-serve checkout via the configured payment
          gateway is coming next.)
        </p>
      </div>
    </div>
  );
}

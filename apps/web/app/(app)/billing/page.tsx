import { Check } from "lucide-react";
import { serverFetch } from "@/lib/server-api";
import { fromMinorUnits } from "@sitetrack/shared-types";
import { getServerT } from "@/lib/i18n/server";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import { UpgradeButton } from "./upgrade-button";
import { CancelSubscriptionButton } from "./cancel-subscription-button";

interface Plan {
  id: string;
  slug: string;
  name: string;
  maxSites: number;
  priceMonthlyMinor: number;
}
interface Subscription {
  status: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
}
interface Billing {
  currentPlan: Plan;
  usage: { sites: number; maxSites: number };
  availablePlans: Plan[];
  subscription: Subscription | null;
}
interface CurrentUser {
  id: string;
}
interface Member {
  user: { id: string };
  role: string;
}
interface HistoryEntry {
  id: string;
  createdAt: string;
  status: string | null;
  cancelAtPeriodEnd: boolean | null;
  viaWebhookEvent: string | null;
}

function limitLabel(maxSites: number, t: (key: TranslationKey) => string) {
  return maxSites === -1
    ? t("billing.unlimitedSites")
    : `${maxSites} ${maxSites === 1 ? t("billing.siteSingular") : t("billing.sitePlural")}`;
}
function priceLabel(minor: number, t: (key: TranslationKey) => string) {
  return minor === 0 ? t("billing.free") : `₹${fromMinorUnits(minor).toLocaleString("en-IN")}${t("billing.perMonth")}`;
}
function historyLabel(entry: HistoryEntry, t: (key: TranslationKey) => string) {
  if (entry.cancelAtPeriodEnd === true) return t("billing.cancellationScheduled");
  if (entry.status === "CANCELLED") return t("billing.subscriptionCancelled");
  if (entry.viaWebhookEvent === "subscription.charged") return t("billing.paymentReceived");
  if (entry.status === "ACTIVE") return t("billing.subscriptionActivated");
  if (entry.status === "PAST_DUE") return t("billing.paymentPending");
  if (entry.status === "HALTED") return t("billing.subscriptionPaused");
  return entry.status ? `${t("billing.statusChanged")} ${entry.status}` : t("billing.subscriptionUpdated");
}

export default async function BillingPage() {
  const t = getServerT();
  const [billing, me, members, history] = await Promise.all([
    serverFetch<Billing>("/billing"),
    serverFetch<CurrentUser>("/auth/me"),
    serverFetch<Member[]>("/members"),
    serverFetch<HistoryEntry[]>("/billing/history"),
  ]);
  const atLimit =
    billing.usage.maxSites !== -1 && billing.usage.sites >= billing.usage.maxSites;
  const isOwner = members.find((m) => m.user.id === me.id)?.role === "OWNER";
  const onUnlimited = billing.currentPlan.slug === "unlimited";
  const sub = billing.subscription;
  const isCancelling = onUnlimited && sub?.status === "ACTIVE" && sub.cancelAtPeriodEnd;
  const canCancel = onUnlimited && sub?.status === "ACTIVE" && !sub.cancelAtPeriodEnd;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">{t("billing.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("billing.subtitle")}</p>
      </div>

      {/* Current plan + usage */}
      <div className="rounded-lg border border-border p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase text-muted-foreground">{t("billing.currentPlan")}</div>
            <div className="text-2xl font-bold">{billing.currentPlan.name}</div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs uppercase text-muted-foreground">{t("billing.sitesUsed")}</div>
              <div className={`text-2xl font-bold ${atLimit ? "text-red-600" : ""}`}>
                {billing.usage.sites}
                {billing.usage.maxSites === -1 ? "" : ` / ${billing.usage.maxSites}`}
              </div>
            </div>
            {isOwner && canCancel && <CancelSubscriptionButton />}
          </div>
        </div>
        {isCancelling && (
          <p className="mt-3 rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
            {t("billing.cancelScheduled")}
            {sub?.currentPeriodEnd ? ` on ${new Date(sub.currentPeriodEnd).toLocaleDateString("en-IN")}` : ""}.{" "}
            {t("billing.cancelScheduledSuffix")}
          </p>
        )}
        {atLimit && (
          <div className="mt-3 flex flex-col gap-2 rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-700 sm:flex-row sm:items-center sm:justify-between dark:text-amber-400">
            <p>
              {isOwner ? t("billing.limitReachedOwner") : t("billing.limitReachedMember")}
            </p>
            {isOwner && !onUnlimited && <UpgradeButton />}
          </div>
        )}
      </div>

      {/* Available plans */}
      <div>
        <h2 className="mb-3 font-semibold">{t("billing.plans")}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {billing.availablePlans.map((plan) => {
            const isCurrent = plan.slug === billing.currentPlan.slug;
            return (
              <div
                key={plan.id}
                className={`flex flex-col gap-3 rounded-lg border p-4 ${isCurrent ? "border-primary ring-1 ring-primary" : "border-border"}`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{plan.name}</div>
                  {isCurrent && (
                    <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      <Check className="h-3 w-3" /> {t("billing.current")}
                    </span>
                  )}
                </div>
                <div>
                  <div className="text-2xl font-bold">{priceLabel(plan.priceMonthlyMinor, t)}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{limitLabel(plan.maxSites, t)}</div>
                </div>
                {!isCurrent && plan.slug === "unlimited" && isOwner && (
                  <div className="mt-1">
                    <UpgradeButton />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {!isOwner && (
          <p className="mt-3 text-xs text-muted-foreground">
            {t("billing.ownerOnly")}
          </p>
        )}
      </div>

      {/* Billing history */}
      <div>
        <h2 className="mb-3 font-semibold">{t("billing.history")}</h2>
        {history.length === 0 ? (
          <p className="rounded-lg border border-border p-6 text-center text-sm text-muted-foreground">
            {t("billing.noHistory")}
          </p>
        ) : (
          <div className="rounded-lg border border-border divide-y divide-border">
            {history.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span>{historyLabel(entry, t)}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(entry.createdAt).toLocaleString("en-IN")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

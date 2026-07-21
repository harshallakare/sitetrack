import { serverFetch } from "@/lib/server-api";
import { getServerT } from "@/lib/i18n/server";
import { AnalyticsFilters } from "./analytics-filters";
import { TallyExportCard } from "./tally-export-card";

interface TagOption {
  id: string;
  name: string;
}
interface CurrentUser {
  id: string;
}
interface Member {
  user: { id: string };
  role: string;
}

export default async function AnalyticsPage() {
  const t = getServerT();
  // The Tally export is finance-only (OWNER/ACCOUNTANT) on the backend; derive
  // the caller's active role so supervisors don't see a card that would 403 on
  // click. Same role-derivation the Team page uses.
  const [tags, me, members] = await Promise.all([
    serverFetch<TagOption[]>("/tags"),
    serverFetch<CurrentUser>("/auth/me"),
    serverFetch<Member[]>("/members"),
  ]);
  const myRole = members.find((m) => m.user.id === me.id)?.role;
  const canExport = myRole === "OWNER" || myRole === "ACCOUNTANT";

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">{t("analytics.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("analytics.subtitle")}</p>
      </div>
      {canExport && <TallyExportCard />}
      <AnalyticsFilters tags={tags} />
    </div>
  );
}

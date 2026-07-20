import { serverFetch } from "@/lib/server-api";
import { getServerT } from "@/lib/i18n/server";
import { AnalyticsFilters } from "./analytics-filters";

interface TagOption {
  id: string;
  name: string;
}

export default async function AnalyticsPage() {
  const t = getServerT();
  const tags = await serverFetch<TagOption[]>("/tags");

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">{t("analytics.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("analytics.subtitle")}</p>
      </div>
      <AnalyticsFilters tags={tags} />
    </div>
  );
}

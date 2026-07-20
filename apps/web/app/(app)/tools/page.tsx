import { getServerT } from "@/lib/i18n/server";
import { ToolsCalculators } from "./calculators";

export default function ToolsPage() {
  const t = getServerT();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">{t("tools.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("tools.subtitle")}</p>
      </div>
      <ToolsCalculators />
    </div>
  );
}

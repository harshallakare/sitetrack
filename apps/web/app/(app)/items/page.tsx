import Link from "next/link";
import { serverFetch } from "@/lib/server-api";
import { fromMinorUnits } from "@sitetrack/shared-types";
import { getServerT } from "@/lib/i18n/server";
import { DeleteButton } from "@/components/ui/delete-button";
import { CreateItemDialog } from "./create-item-dialog";
import { EditItemDialog } from "./edit-item-dialog";
import { CopyItemButton } from "./copy-item-button";

interface Item {
  id: string;
  name: string;
  unitOfMeasure: string;
  category: string | null;
  description: string | null;
}

interface ItemStats {
  totalDelivered: number;
  avgUnitPriceMinor: number;
}

const EMPTY_STATS: ItemStats = { totalDelivered: 0, avgUnitPriceMinor: 0 };

export default async function ItemsPage() {
  const t = getServerT();
  // Two requests total (was one per item -- an N+1 over HTTP with 119 items).
  const [items, statsByItem] = await Promise.all([
    serverFetch<Item[]>("/items"),
    serverFetch<Record<string, ItemStats>>("/items/stats"),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("items.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("items.subtitle")}</p>
        </div>
        <CreateItemDialog />
      </div>

      {items.length === 0 ? (
        <p className="rounded-lg border border-border p-8 text-center text-muted-foreground">
          {t("items.empty")}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const stats = statsByItem[item.id] ?? EMPTY_STATS;
            return (
              <div
                key={item.id}
                className="relative rounded-lg border border-border p-4 transition-colors hover:bg-muted/50"
              >
                {/* Full-card overlay link so clicking anywhere navigates to the
                    detail page; the action buttons below sit above it (z-10 +
                    pointer-events-auto) so they intercept their own clicks
                    instead of the overlay. Buttons can't be nested inside the
                    Link itself -- <button> inside <a> is invalid HTML and the
                    anchor's native navigation fires regardless of
                    stopPropagation on a descendant. */}
                <Link href={`/items/${item.id}`} className="absolute inset-0 z-0" aria-label={item.name} />
                <div className="pointer-events-none relative z-10 flex items-start justify-between gap-2">
                  <div className="font-medium">{item.name}</div>
                  <div className="pointer-events-auto flex items-center gap-0.5">
                    <EditItemDialog item={item} />
                    <CopyItemButton item={item} />
                    <DeleteButton path={`/items/${item.id}`} confirmMessage={t("items.deleteConfirm")} />
                  </div>
                </div>
                <div className="pointer-events-none relative z-10 text-sm text-muted-foreground">
                  {item.unitOfMeasure.replace("_", " ")} {item.category ? `· ${item.category}` : ""}
                </div>
                <div className="pointer-events-none relative z-10 mt-3 flex items-center justify-between text-sm">
                  <div>
                    <div className="text-muted-foreground">{t("items.totalDelivered")}</div>
                    <div className="font-semibold">{stats.totalDelivered}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-muted-foreground">{t("items.avgPrice")}</div>
                    <div className="font-semibold text-primary">
                      ₹{fromMinorUnits(stats.avgUnitPriceMinor).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

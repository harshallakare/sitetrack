import { serverFetch } from "@/lib/server-api";
import { fromMinorUnits } from "@sitetrack/shared-types";
import { CreateItemDialog } from "./create-item-dialog";

interface Item {
  id: string;
  name: string;
  unitOfMeasure: string;
  category: string | null;
}

interface ItemStats {
  totalDelivered: number;
  avgUnitPriceMinor: number;
}

const EMPTY_STATS: ItemStats = { totalDelivered: 0, avgUnitPriceMinor: 0 };

export default async function ItemsPage() {
  // Two requests total (was one per item -- an N+1 over HTTP with 119 items).
  const [items, statsByItem] = await Promise.all([
    serverFetch<Item[]>("/items"),
    serverFetch<Record<string, ItemStats>>("/items/stats"),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Items</h1>
          <p className="text-sm text-muted-foreground">Manage your construction items and quantities</p>
        </div>
        <CreateItemDialog />
      </div>

      {items.length === 0 ? (
        <p className="rounded-lg border border-border p-8 text-center text-muted-foreground">
          No items yet. Add construction materials like cement, steel, and bricks.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const stats = statsByItem[item.id] ?? EMPTY_STATS;
            return (
              <div key={item.id} className="rounded-lg border border-border p-4">
                <div className="font-medium">{item.name}</div>
                <div className="text-sm text-muted-foreground">
                  {item.unitOfMeasure.replace("_", " ")} {item.category ? `· ${item.category}` : ""}
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <div>
                    <div className="text-muted-foreground">Total Delivered</div>
                    <div className="font-semibold">{stats.totalDelivered}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-muted-foreground">Avg. Price</div>
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

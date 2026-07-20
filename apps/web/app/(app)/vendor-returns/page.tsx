import { serverFetch } from "@/lib/server-api";
import { fromMinorUnits } from "@sitetrack/shared-types";
import { DeleteButton } from "@/components/ui/delete-button";
import { getServerT } from "@/lib/i18n/server";
import { CreateReturnDialog } from "./create-return-dialog";
import { UpdateReturnDialog } from "./update-return-dialog";

interface ReturnLineItem {
  id: string;
  quantity: number;
  lineTotalMinor: number;
  item: { name: string; unitOfMeasure: string };
}

interface VendorReturn {
  id: string;
  returnDate: string;
  reason: string | null;
  status: string;
  notes: string | null;
  vendor: { contactPerson: string; companyName: string | null };
  site: { name: string };
  lineItems: ReturnLineItem[];
}

function returnTotalMinor(vendorReturn: VendorReturn): number {
  return vendorReturn.lineItems.reduce((sum, li) => sum + li.lineTotalMinor, 0);
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-muted text-muted-foreground",
  COMPLETED: "bg-green-500/10 text-green-600",
  REJECTED: "bg-red-500/10 text-red-600",
};

export default async function VendorReturnsPage() {
  const t = getServerT();
  const [returns, sites, vendors, items] = await Promise.all([
    serverFetch<VendorReturn[]>("/vendor-returns"),
    serverFetch<Array<{ id: string; name: string }>>("/sites"),
    serverFetch<Array<{ id: string; contactPerson: string; companyName: string | null }>>("/vendors"),
    serverFetch<Array<{ id: string; name: string; unitOfMeasure: string }>>("/items"),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("returns.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("returns.subtitle")}</p>
        </div>
        <CreateReturnDialog
          sites={sites.map((s) => ({ id: s.id, label: s.name }))}
          vendors={vendors.map((v) => ({ id: v.id, label: v.companyName ?? v.contactPerson }))}
          items={items.map((it) => ({ id: it.id, label: `${it.name} (${it.unitOfMeasure.replace("_", " ")})` }))}
        />
      </div>

      {returns.length === 0 ? (
        <p className="rounded-lg border border-border p-8 text-center text-muted-foreground">
          {t("returns.empty")}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {returns.map((vendorReturn) => (
            <div key={vendorReturn.id} className="rounded-lg border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-medium">
                    {vendorReturn.vendor.companyName ?? vendorReturn.vendor.contactPerson}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {vendorReturn.site.name} · {new Date(vendorReturn.returnDate).toLocaleDateString()}
                    {vendorReturn.reason ? ` · ${vendorReturn.reason}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="font-semibold text-primary">₹{fromMinorUnits(returnTotalMinor(vendorReturn)).toFixed(2)}</div>
                  </div>
                  <UpdateReturnDialog vendorReturn={vendorReturn} />
                  <DeleteButton path={`/vendor-returns/${vendorReturn.id}`} confirmMessage={t("returns.deleteConfirm")} />
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className={`rounded-full px-2 py-0.5 font-medium ${STATUS_STYLES[vendorReturn.status] ?? "bg-muted"}`}>
                  {vendorReturn.status}
                </span>
                {vendorReturn.lineItems.map((li) => (
                  <span key={li.id} className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                    {li.item.name}: {li.quantity} {li.item.unitOfMeasure.replace("_", " ")}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

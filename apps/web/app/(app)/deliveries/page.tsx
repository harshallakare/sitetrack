import { serverFetch } from "@/lib/server-api";
import { fromMinorUnits } from "@sitetrack/shared-types";
import { SearchBox } from "@/components/ui/search-box";
import { DeleteButton } from "@/components/ui/delete-button";
import { PaginationNav } from "@/components/ui/pagination-nav";
import { getServerT } from "@/lib/i18n/server";
import { CreateDeliveryDialog } from "./create-delivery-dialog";

interface DeliveryLineItem {
  id: string;
  quantity: number;
  lineTotalMinor: number;
  item: { name: string; unitOfMeasure: string };
}

interface Attachment {
  id: string;
  fileName: string;
  mimeType: string;
}

interface Delivery {
  id: string;
  deliveryDate: string;
  referenceNumber: string | null;
  status: string;
  vendor: { contactPerson: string; companyName: string | null };
  site: { name: string };
  lineItems: DeliveryLineItem[];
  attachments: Attachment[];
}

function deliveryTotalMinor(delivery: Delivery): number {
  return delivery.lineItems.reduce((sum, li) => sum + li.lineTotalMinor, 0);
}

const PAGE_SIZE = 50;

export default async function DeliveriesPage({
  searchParams,
}: {
  searchParams: { search?: string; page?: string };
}) {
  const t = getServerT();
  const search = searchParams.search ?? "";
  const page = Math.max(1, Number(searchParams.page) || 1);
  // Fetch one extra row purely to know whether a next page exists.
  const query = new URLSearchParams({
    ...(search ? { search } : {}),
    limit: String(PAGE_SIZE + 1),
    skip: String((page - 1) * PAGE_SIZE),
  });
  const [deliveriesPlus, sites, vendors, items] = await Promise.all([
    serverFetch<Delivery[]>(`/deliveries?${query}`),
    serverFetch<Array<{ id: string; name: string }>>("/sites"),
    serverFetch<Array<{ id: string; contactPerson: string; companyName: string | null }>>("/vendors"),
    serverFetch<Array<{ id: string; name: string; unitOfMeasure: string }>>("/items"),
  ]);
  const hasNext = deliveriesPlus.length > PAGE_SIZE;
  const deliveries = deliveriesPlus.slice(0, PAGE_SIZE);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("deliveries.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("deliveries.subtitle")}</p>
        </div>
        <CreateDeliveryDialog
          sites={sites.map((s) => ({ id: s.id, label: s.name }))}
          vendors={vendors.map((v) => ({ id: v.id, label: v.companyName ?? v.contactPerson }))}
          items={items.map((it) => ({ id: it.id, label: `${it.name} (${it.unitOfMeasure.replace("_", " ")})` }))}
        />
      </div>

      <SearchBox placeholder={t("deliveries.searchPlaceholder")} />

      {deliveries.length === 0 ? (
        <p className="rounded-lg border border-border p-8 text-center text-muted-foreground">
          {search ? t("deliveries.emptySearch") : t("deliveries.empty")}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {deliveries.map((delivery) => (
            <div key={delivery.id} className="rounded-lg border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-medium">{delivery.vendor.companyName ?? delivery.vendor.contactPerson}</div>
                  <div className="text-sm text-muted-foreground">
                    {delivery.site.name} · {new Date(delivery.deliveryDate).toLocaleDateString()}
                    {delivery.referenceNumber ? ` · ${delivery.referenceNumber}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="font-semibold text-primary">₹{fromMinorUnits(deliveryTotalMinor(delivery)).toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">{delivery.status}</div>
                  </div>
                  <DeleteButton
                    path={`/deliveries/${delivery.id}`}
                    confirmMessage={t("deliveries.deleteConfirm")}
                  />
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                {delivery.lineItems.map((li) => (
                  <span key={li.id} className="rounded-full bg-muted px-2 py-0.5">
                    {li.item.name}: {li.quantity} {li.item.unitOfMeasure.replace("_", " ")}
                  </span>
                ))}
              </div>
              {delivery.attachments.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-3 border-t border-border pt-2 text-xs">
                  {delivery.attachments.map((a) => (
                    <a
                      key={a.id}
                      href={`/api/proxy/deliveries/attachments/${a.id}/download`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      📎 {a.fileName}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <PaginationNav
        basePath="/deliveries"
        page={page}
        hasNext={hasNext}
        extraParams={search ? { search } : {}}
      />
    </div>
  );
}

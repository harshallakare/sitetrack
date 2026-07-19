import Link from "next/link";
import { serverFetch } from "@/lib/server-api";
import { getServerT } from "@/lib/i18n/server";
import { CreateSiteDialog } from "./create-site-dialog";

interface Site {
  id: string;
  name: string;
  address: string | null;
  plannedSqft: number | null;
  unitCount: number | null;
  isActive: boolean;
}

export default async function SitesPage() {
  const t = getServerT();
  const sites = await serverFetch<Site[]>("/sites");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("sites.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("sites.subtitle")}</p>
        </div>
        <CreateSiteDialog />
      </div>

      {sites.length === 0 ? (
        <p className="rounded-lg border border-border p-8 text-center text-muted-foreground">
          {t("sites.empty")}
        </p>
      ) : (
        <>
          {/* Desktop table */}
          <table className="hidden w-full border-collapse text-sm md:table">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 pr-4 font-medium">{t("sites.colName")}</th>
                <th className="py-2 pr-4 font-medium">{t("sites.colAddress")}</th>
                <th className="py-2 pr-4 font-medium">{t("sites.colUnits")}</th>
                <th className="py-2 pr-4 font-medium">{t("sites.colPlannedArea")}</th>
                <th className="py-2 pr-4 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {sites.map((site) => (
                <tr key={site.id} className="border-b border-border">
                  <td className="py-3 pr-4 font-medium">{site.name}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{site.address ?? "—"}</td>
                  <td className="py-3 pr-4">{site.unitCount ?? "—"}</td>
                  <td className="py-3 pr-4">{site.plannedSqft ? `${site.plannedSqft} sqft` : "—"}</td>
                  <td className="py-3 pr-4 text-right">
                    <Link href={`/sites/${site.id}`} className="text-sm text-primary underline-offset-4 hover:underline">
                      {t("sites.viewBudget")}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile stacked cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {sites.map((site) => (
              <Link key={site.id} href={`/sites/${site.id}`} className="rounded-lg border border-border p-4">
                <div className="font-medium">{site.name}</div>
                {site.address && <div className="text-sm text-muted-foreground">{site.address}</div>}
                <div className="mt-2 flex gap-4 text-sm text-muted-foreground">
                  <span>{site.unitCount ?? "—"} {t("sites.unitsSuffix")}</span>
                  <span>{site.plannedSqft ? `${site.plannedSqft} sqft` : "—"}</span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

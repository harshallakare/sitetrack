import Link from "next/link";
import { serverFetch } from "@/lib/server-api";
import { fromMinorUnits } from "@sitetrack/shared-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerT } from "@/lib/i18n/server";

export default async function DashboardPage() {
  const t = getServerT();
  const [sites, vendors, items, deliveries, accounts, payables] = await Promise.all([
    serverFetch<unknown[]>("/sites"),
    serverFetch<unknown[]>("/vendors"),
    serverFetch<unknown[]>("/items"),
    serverFetch<unknown[]>("/deliveries"),
    serverFetch<Array<{ currentBalanceMinor: number }>>("/accounts"),
    serverFetch<{ totalOutstandingMinor: number }>("/vendors/payables"),
  ]);

  const totalBalanceMinor = accounts.reduce((sum, a) => sum + a.currentBalanceMinor, 0);

  const stats = [
    { label: t("nav.sites"), value: sites.length, href: "/sites" },
    { label: t("nav.vendors"), value: vendors.length, href: "/vendors" },
    { label: t("nav.items"), value: items.length, href: "/items" },
    { label: t("nav.deliveries"), value: deliveries.length, href: "/deliveries" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">{t("dashboard.overview")}</h1>
        <p className="text-sm text-muted-foreground">{t("dashboard.subtitle")}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="transition-colors hover:bg-muted">
              <CardHeader>
                <CardTitle className="text-3xl">{stat.value}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-sm text-muted-foreground">{stat.label}</CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.totalBalance")}</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold text-primary">
            ₹{fromMinorUnits(totalBalanceMinor).toFixed(2)}
          </CardContent>
        </Card>
        <Link href="/vendors">
          <Card className="h-full transition-colors hover:bg-muted">
            <CardHeader>
              <CardTitle>{t("dashboard.outstandingToVendors")}</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-bold text-primary">
              ₹{fromMinorUnits(payables.totalOutstandingMinor).toFixed(2)}
            </CardContent>
          </Card>
        </Link>
      </div>

      {sites.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.gettingStarted")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
            <p>{t("dashboard.welcome")}</p>
            <ol className="list-decimal pl-5">
              <li>
                {t("dashboard.step1").split("{link}")[0]}
                <Link href="/sites" className="text-primary underline-offset-4 hover:underline">
                  {t("dashboard.constructionSiteLink")}
                </Link>
                {t("dashboard.step1").split("{link}")[1]}
              </li>
              <li>
                {t("dashboard.step2").split("{vendors}")[0]}
                <Link href="/vendors" className="text-primary underline-offset-4 hover:underline">
                  {t("dashboard.vendorsLink")}
                </Link>
                {t("dashboard.step2").split("{vendors}")[1]?.split("{items}")[0]}
                <Link href="/items" className="text-primary underline-offset-4 hover:underline">
                  {t("dashboard.itemsLink")}
                </Link>
                {t("dashboard.step2").split("{items}")[1]}
              </li>
              <li>
                {t("dashboard.step3").split("{link}")[0]}
                <Link href="/deliveries" className="text-primary underline-offset-4 hover:underline">
                  {t("dashboard.deliveryLink")}
                </Link>
                {t("dashboard.step3").split("{link}")[1]}
              </li>
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

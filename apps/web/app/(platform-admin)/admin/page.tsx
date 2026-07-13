import { adminServerFetch as serverFetch } from "@/lib/admin-server-api";
import { fromMinorUnits } from "@sitetrack/shared-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PlatformStats {
  organizationCount: number;
  activeOrganizationCount: number;
  suspendedOrganizationCount: number;
  userCount: number;
  siteCount: number;
  deliveryCount: number;
  totalPaymentVolumeMinor: number;
}

export default async function AdminOverviewPage() {
  const stats = await serverFetch<PlatformStats>("/admin/stats");

  const tiles = [
    { label: "Organizations", value: stats.organizationCount },
    { label: "Active", value: stats.activeOrganizationCount },
    { label: "Suspended", value: stats.suspendedOrganizationCount },
    { label: "Users", value: stats.userCount },
    { label: "Sites", value: stats.siteCount },
    { label: "Deliveries", value: stats.deliveryCount },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Platform Overview</h1>
        <p className="text-sm text-muted-foreground">Cross-tenant totals across every organization on SiteTrack</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {tiles.map((tile) => (
          <Card key={tile.label}>
            <CardHeader>
              <CardTitle className="text-3xl">{tile.value}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-sm text-muted-foreground">{tile.label}</CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Total Payment Volume (all organizations)</CardTitle>
        </CardHeader>
        <CardContent className="text-3xl font-bold text-primary">
          ₹{fromMinorUnits(stats.totalPaymentVolumeMinor).toFixed(2)}
        </CardContent>
      </Card>
    </div>
  );
}

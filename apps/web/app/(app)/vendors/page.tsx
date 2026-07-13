import Link from "next/link";
import { serverFetch } from "@/lib/server-api";
import { fromMinorUnits } from "@sitetrack/shared-types";
import { CreateVendorDialog } from "./create-vendor-dialog";

interface Vendor {
  id: string;
  contactPerson: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  tags: Array<{ tag: { id: string; name: string } }>;
}

interface Payables {
  totalOutstandingMinor: number;
  vendors: Array<{ id: string; outstandingMinor: number; deliveredMinor: number; paidMinor: number }>;
}

function money(minor: number) {
  return `₹${fromMinorUnits(minor).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function VendorsPage() {
  const [vendors, payables] = await Promise.all([
    serverFetch<Vendor[]>("/vendors"),
    serverFetch<Payables>("/vendors/payables"),
  ]);
  const outstandingById = new Map(payables.vendors.map((v) => [v.id, v.outstandingMinor]));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Vendors</h1>
          <p className="text-sm text-muted-foreground">Manage your vendor contacts and outstanding balances</p>
        </div>
        <CreateVendorDialog />
      </div>

      {/* Total payables — the headline number */}
      <div className="rounded-lg border border-border p-4">
        <div className="text-xs uppercase text-muted-foreground">Total Outstanding (Payables)</div>
        <div className="text-2xl font-bold text-primary">{money(payables.totalOutstandingMinor)}</div>
        <div className="text-xs text-muted-foreground">What you still owe across all vendors</div>
      </div>

      {vendors.length === 0 ? (
        <p className="rounded-lg border border-border p-8 text-center text-muted-foreground">
          No vendors yet. Get started by adding a vendor.
        </p>
      ) : (
        <>
          <table className="hidden w-full border-collapse text-sm md:table">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Contact</th>
                <th className="py-2 pr-4 font-medium">Company</th>
                <th className="py-2 pr-4 font-medium">Phone</th>
                <th className="py-2 pr-4 text-right font-medium">Outstanding</th>
                <th className="py-2 pr-4 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {vendors.map((vendor) => {
                const outstanding = outstandingById.get(vendor.id) ?? 0;
                return (
                  <tr key={vendor.id} className="border-b border-border">
                    <td className="py-3 pr-4 font-medium">{vendor.contactPerson}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{vendor.companyName ?? "—"}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{vendor.phone ?? "—"}</td>
                    <td className={`py-3 pr-4 text-right font-semibold ${outstanding > 0 ? "text-primary" : "text-muted-foreground"}`}>
                      {money(outstanding)}
                    </td>
                    <td className="py-3 pr-4 text-right">
                      <Link href={`/vendors/${vendor.id}`} className="text-sm text-primary underline-offset-4 hover:underline">
                        View ledger
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="flex flex-col gap-3 md:hidden">
            {vendors.map((vendor) => {
              const outstanding = outstandingById.get(vendor.id) ?? 0;
              return (
                <Link key={vendor.id} href={`/vendors/${vendor.id}`} className="rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{vendor.contactPerson}</div>
                    <div className={`font-semibold ${outstanding > 0 ? "text-primary" : "text-muted-foreground"}`}>
                      {money(outstanding)}
                    </div>
                  </div>
                  {vendor.companyName && <div className="text-sm text-muted-foreground">{vendor.companyName}</div>}
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

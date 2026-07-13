import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Truck, ArrowLeftRight } from "lucide-react";
import { serverFetch } from "@/lib/server-api";
import { fromMinorUnits } from "@sitetrack/shared-types";

interface LedgerEntry {
  type: "DELIVERY" | "PAYMENT";
  id: string;
  date: string;
  reference: string | null;
  siteName: string | null;
  amountMinor: number;
}
interface Ledger {
  vendor: { id: string; contactPerson: string; companyName: string | null };
  deliveredMinor: number;
  paidMinor: number;
  outstandingMinor: number;
  entries: LedgerEntry[];
}

function money(minor: number) {
  return `₹${fromMinorUnits(minor).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function VendorLedgerPage({ params }: { params: { id: string } }) {
  // A cross-tenant or unknown id 404s at the API -- render the not-found
  // page instead of the generic error boundary.
  const ledger = await serverFetch<Ledger>(`/vendors/${params.id}/ledger`).catch(() => null);
  if (!ledger) notFound();

  return (
    <div className="flex flex-col gap-4">
      <Link href="/vendors" className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to vendors
      </Link>

      <div>
        <h1 className="text-2xl font-bold">{ledger.vendor.companyName ?? ledger.vendor.contactPerson}</h1>
        <p className="text-sm text-muted-foreground">{ledger.vendor.contactPerson} · Ledger</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border p-4">
          <div className="text-xs uppercase text-muted-foreground">Total Delivered</div>
          <div className="text-2xl font-bold">{money(ledger.deliveredMinor)}</div>
        </div>
        <div className="rounded-lg border border-border p-4">
          <div className="text-xs uppercase text-muted-foreground">Total Paid</div>
          <div className="text-2xl font-bold">{money(ledger.paidMinor)}</div>
        </div>
        <div className="rounded-lg border border-border p-4">
          <div className="text-xs uppercase text-muted-foreground">Outstanding</div>
          <div className={`text-2xl font-bold ${ledger.outstandingMinor > 0 ? "text-primary" : "text-green-600"}`}>
            {money(ledger.outstandingMinor)}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border">
        <div className="border-b border-border px-4 py-3 font-semibold">Transactions</div>
        {ledger.entries.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">No deliveries or payments recorded yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {ledger.entries.map((e) => (
              <div key={`${e.type}-${e.id}`} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className={`rounded-md p-2 ${e.type === "DELIVERY" ? "bg-muted" : "bg-primary/10"}`}>
                    {e.type === "DELIVERY" ? <Truck className="h-4 w-4" /> : <ArrowLeftRight className="h-4 w-4" />}
                  </span>
                  <div>
                    <div className="text-sm font-medium">
                      {e.type === "DELIVERY" ? "Delivery" : "Payment"}
                      {e.reference ? ` · ${e.reference}` : ""}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(e.date).toLocaleDateString()} {e.siteName ? `· ${e.siteName}` : ""}
                    </div>
                  </div>
                </div>
                <div className={`font-semibold ${e.type === "DELIVERY" ? "text-foreground" : "text-green-600"}`}>
                  {e.type === "DELIVERY" ? "+" : "−"}
                  {money(e.amountMinor)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

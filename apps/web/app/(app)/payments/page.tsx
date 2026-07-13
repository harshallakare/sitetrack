import { serverFetch } from "@/lib/server-api";
import { fromMinorUnits } from "@sitetrack/shared-types";
import { SearchBox } from "@/components/ui/search-box";
import { DeleteButton } from "@/components/ui/delete-button";
import { PaginationNav } from "@/components/ui/pagination-nav";
import { CreatePaymentDialog } from "./create-payment-dialog";

interface Payment {
  id: string;
  amountMinor: number;
  paymentDate: string;
  notes: string | null;
  vendor: { contactPerson: string; companyName: string | null };
  account: { name: string };
  site: { name: string };
}

const PAGE_SIZE = 50;

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: { search?: string; page?: string };
}) {
  const search = searchParams.search ?? "";
  const page = Math.max(1, Number(searchParams.page) || 1);
  // Fetch one extra row purely to know whether a next page exists.
  const query = new URLSearchParams({
    ...(search ? { search } : {}),
    limit: String(PAGE_SIZE + 1),
    skip: String((page - 1) * PAGE_SIZE),
  });
  const [paymentsPlus, sites, accounts, vendors] = await Promise.all([
    serverFetch<Payment[]>(`/payments?${query}`),
    serverFetch<Array<{ id: string; name: string }>>("/sites"),
    serverFetch<Array<{ id: string; name: string }>>("/accounts"),
    serverFetch<Array<{ id: string; contactPerson: string; companyName: string | null }>>("/vendors"),
  ]);
  const hasNext = paymentsPlus.length > PAGE_SIZE;
  const payments = paymentsPlus.slice(0, PAGE_SIZE);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Payments</h1>
          <p className="text-sm text-muted-foreground">Track payments to vendors and manage payment status</p>
        </div>
        <CreatePaymentDialog
          sites={sites.map((s) => ({ id: s.id, label: s.name }))}
          accounts={accounts.map((a) => ({ id: a.id, label: a.name }))}
          vendors={vendors.map((v) => ({ id: v.id, label: v.companyName ?? v.contactPerson }))}
        />
      </div>

      <SearchBox placeholder="Search by vendor or note..." />

      {payments.length === 0 ? (
        <p className="rounded-lg border border-border p-8 text-center text-muted-foreground">
          {search ? "No payments match your search." : "No payments recorded. Start tracking by recording a payment."}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {payments.map((payment) => (
            <div key={payment.id} className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <div className="font-medium">{payment.vendor.companyName ?? payment.vendor.contactPerson}</div>
                <div className="text-sm text-muted-foreground">
                  {payment.account.name} · {payment.site.name} · {new Date(payment.paymentDate).toLocaleDateString()}
                </div>
                {payment.notes && <div className="text-xs text-muted-foreground">{payment.notes}</div>}
              </div>
              <div className="flex items-center gap-3">
                <div className="font-semibold text-primary">₹{fromMinorUnits(payment.amountMinor).toFixed(2)}</div>
                <DeleteButton
                  path={`/payments/${payment.id}`}
                  confirmMessage="Delete this payment? The account balance it drew down will be restored."
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <PaginationNav
        basePath="/payments"
        page={page}
        hasNext={hasNext}
        extraParams={search ? { search } : {}}
      />
    </div>
  );
}

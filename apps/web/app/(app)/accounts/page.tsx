import { serverFetch } from "@/lib/server-api";
import { fromMinorUnits } from "@sitetrack/shared-types";
import { getServerT } from "@/lib/i18n/server";
import { CreateAccountDialog } from "./create-account-dialog";

interface Account {
  id: string;
  name: string;
  type: string;
  currentBalanceMinor: number;
  description: string | null;
}

export default async function AccountsPage() {
  const t = getServerT();
  const accounts = await serverFetch<Account[]>("/accounts");
  const totalBalanceMinor = accounts.reduce((sum, a) => sum + a.currentBalanceMinor, 0);
  const lowBalanceCount = accounts.filter((a) => a.currentBalanceMinor < 100000).length; // < ₹1,000

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("accounts.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("accounts.subtitle")}</p>
        </div>
        <CreateAccountDialog />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border p-4">
          <div className="text-xs uppercase text-muted-foreground">{t("accounts.totalBalance")}</div>
          <div className="text-2xl font-bold text-primary">₹{fromMinorUnits(totalBalanceMinor).toFixed(2)}</div>
        </div>
        <div className="rounded-lg border border-border p-4">
          <div className="text-xs uppercase text-muted-foreground">{t("accounts.activeAccounts")}</div>
          <div className="text-2xl font-bold">{accounts.length}</div>
        </div>
        <div className="rounded-lg border border-border p-4">
          <div className="text-xs uppercase text-muted-foreground">{t("accounts.lowBalance")}</div>
          <div className="text-2xl font-bold">{lowBalanceCount}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {accounts.map((account) => (
          <div key={account.id} className="rounded-lg border border-border p-4">
            <div className="font-medium">{account.name}</div>
            <div className="text-sm text-muted-foreground">{account.type}</div>
            {account.description && <div className="mt-1 text-xs text-muted-foreground">{account.description}</div>}
            <div className="mt-3 text-lg font-semibold text-primary">₹{fromMinorUnits(account.currentBalanceMinor).toFixed(2)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

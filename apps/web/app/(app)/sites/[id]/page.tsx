import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { serverFetch } from "@/lib/server-api";
import { BudgetManager, type SiteBudget } from "./budget-manager";

export default async function SiteBudgetPage({ params }: { params: { id: string } }) {
  const budget = await serverFetch<SiteBudget>(`/sites/${params.id}/budget`);

  return (
    <div className="flex flex-col gap-4">
      <Link href="/sites" className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to sites
      </Link>
      <div>
        <h1 className="text-2xl font-bold">{budget.site.name}</h1>
        <p className="text-sm text-muted-foreground">Budget vs. actual spend by category</p>
      </div>
      <BudgetManager siteId={params.id} budget={budget} />
    </div>
  );
}

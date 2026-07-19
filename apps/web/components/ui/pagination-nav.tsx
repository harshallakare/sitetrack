import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getServerT } from "@/lib/i18n/server";

/**
 * Server-rendered Prev/Next pagination. Pages are 1-based and carried in the
 * `page` query param; any extra params (e.g. search) are preserved.
 */
export function PaginationNav({
  basePath,
  page,
  hasNext,
  extraParams = {},
}: {
  basePath: string;
  page: number;
  hasNext: boolean;
  extraParams?: Record<string, string>;
}) {
  if (page <= 1 && !hasNext) return null;
  const t = getServerT();

  const href = (target: number) => {
    const params = new URLSearchParams(extraParams);
    if (target > 1) params.set("page", String(target));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const linkClass =
    "flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted";
  const disabledClass = "pointer-events-none opacity-40";

  return (
    <nav className="flex items-center justify-between">
      <Link href={href(page - 1)} className={`${linkClass} ${page <= 1 ? disabledClass : ""}`} aria-disabled={page <= 1}>
        <ChevronLeft className="h-4 w-4" /> {t("common.previous")}
      </Link>
      <span className="text-sm text-muted-foreground">{t("common.page")} {page}</span>
      <Link href={href(page + 1)} className={`${linkClass} ${!hasNext ? disabledClass : ""}`} aria-disabled={!hasNext}>
        {t("common.next")} <ChevronRight className="h-4 w-4" />
      </Link>
    </nav>
  );
}

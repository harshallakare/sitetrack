import { Controller, Get, Query } from "@nestjs/common";
import { ExportService, type TallyExportFilters } from "./export.service";

function parseDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

@Controller("export")
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  /**
   * Returns Tally-importable voucher XML as a JSON envelope ({ filename, xml,
   * voucherCount }) so the web app can trigger a client-side download through
   * the same cookie-authenticated proxy as every other fetch, rather than
   * streaming a file and dealing with auth on a raw <a download> link.
   */
  @Get("tally")
  tally(
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("siteId") siteId?: string
  ) {
    const filters: TallyExportFilters = {
      from: parseDate(from),
      to: parseDate(to),
      siteId: siteId || undefined,
    };
    return this.exportService.tally(filters);
  }
}

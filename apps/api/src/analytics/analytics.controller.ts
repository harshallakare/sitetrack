import { Controller, Get, Query } from "@nestjs/common";
import { AnalyticsService } from "./analytics.service";

function parseAmountMinor(value?: string): number | undefined {
  if (value === undefined || value === "") return undefined;
  const rupees = Number(value);
  return Number.isFinite(rupees) ? Math.round(rupees * 100) : undefined;
}

@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get("costs")
  getCostAnalytics(
    @Query("tagIds") tagIds?: string,
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
    @Query("minAmount") minAmount?: string,
    @Query("maxAmount") maxAmount?: string
  ) {
    return this.analyticsService.getCostAnalytics({
      tagIds: tagIds ? tagIds.split(",").filter(Boolean) : undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      minAmountMinor: parseAmountMinor(minAmount),
      maxAmountMinor: parseAmountMinor(maxAmount),
    });
  }
}

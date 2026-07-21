import { BadRequestException, Injectable } from "@nestjs/common";
import { fromMinorUnits } from "@sitetrack/shared-types";
import { PrismaService } from "../prisma/prisma.service";
import { buildTallyXml, type TallyVoucher } from "./tally-xml";

// Standard Tally ledger the app books all material purchases against. The
// contractor's accountant can rename/remap it inside Tally on import if their
// chart of accounts differs -- the point is a consistent, predictable name.
const PURCHASE_LEDGER = "Purchase Account";

// Upper bound on how many source records (deliveries + payments + returns) a
// single export may span. Without this, an all-time export on a large/old org
// would load years of rows into memory and build one enormous XML string.
// Hitting it means "narrow the date range" -- a month or quarter is the normal
// accounting cadence anyway, and is well under this ceiling.
const MAX_EXPORT_RECORDS = 5000;

export interface TallyExportFilters {
  from?: Date;
  to?: Date;
  siteId?: string;
}

@Injectable()
export class ExportService {
  constructor(private readonly prisma: PrismaService) {}

  /** Vendor display name used as the Tally party ledger. */
  private static partyName(vendor: { companyName: string | null; contactPerson: string }): string {
    return vendor.companyName ?? vendor.contactPerson;
  }

  async tally(filters: TallyExportFilters): Promise<{ filename: string; xml: string; voucherCount: number }> {
    const siteWhere = filters.siteId ? { siteId: filters.siteId } : {};
    const dateRange = (field: string) => {
      const range: Record<string, Date> = {};
      if (filters.from) range.gte = filters.from;
      if (filters.to) range.lte = filters.to;
      return Object.keys(range).length ? { [field]: range } : {};
    };

    // Fetch one past the cap so an overflow is detectable, then reject rather
    // than silently truncating the books (a partial export would be worse than
    // no export). The take bounds worst-case memory at ~3x the cap.
    const take = MAX_EXPORT_RECORDS + 1;
    const [deliveries, payments, returns] = await Promise.all([
      this.prisma.db.delivery.findMany({
        where: { ...siteWhere, ...dateRange("deliveryDate") },
        include: { vendor: true, lineItems: { select: { lineTotalMinor: true } } },
        orderBy: { deliveryDate: "asc" },
        take,
      }),
      this.prisma.db.payment.findMany({
        where: { ...siteWhere, ...dateRange("paymentDate") },
        include: { vendor: true, account: true },
        orderBy: { paymentDate: "asc" },
        take,
      }),
      this.prisma.db.vendorReturn.findMany({
        // Only COMPLETED returns move money -- PENDING/REJECTED must not appear
        // in the books (mirrors LedgerService's outstanding calculation).
        where: { status: "COMPLETED", ...siteWhere, ...dateRange("returnDate") },
        include: { vendor: true, lineItems: { select: { lineTotalMinor: true } } },
        orderBy: { returnDate: "asc" },
        take,
      }),
    ]);

    if (deliveries.length + payments.length + returns.length > MAX_EXPORT_RECORDS) {
      throw new BadRequestException(
        `This export spans more than ${MAX_EXPORT_RECORDS} transactions. Narrow the date range (a month or quarter at a time) and try again.`
      );
    }

    const vouchers: TallyVoucher[] = [];

    // Purchase voucher per delivery: debit Purchases, credit the vendor.
    for (const delivery of deliveries) {
      const totalMinor = delivery.lineItems.reduce((sum, li) => sum + li.lineTotalMinor, 0);
      if (totalMinor === 0) continue;
      const amount = fromMinorUnits(totalMinor);
      const party = ExportService.partyName(delivery.vendor);
      vouchers.push({
        type: "Purchase",
        date: delivery.deliveryDate,
        partyLedgerName: party,
        reference: delivery.referenceNumber,
        narration: delivery.notes,
        entries: [
          { ledgerName: PURCHASE_LEDGER, isDebit: true, amount },
          { ledgerName: party, isDebit: false, amount },
        ],
      });
    }

    // Payment voucher per payment: debit the vendor, credit the Cash/Bank
    // account the money actually came out of.
    for (const payment of payments) {
      const amount = fromMinorUnits(payment.amountMinor);
      const party = ExportService.partyName(payment.vendor);
      vouchers.push({
        type: "Payment",
        date: payment.paymentDate,
        partyLedgerName: party,
        narration: payment.notes,
        entries: [
          { ledgerName: party, isDebit: true, amount },
          { ledgerName: payment.account.name, isDebit: false, amount },
        ],
      });
    }

    // Credit note per completed return: debit the vendor (reduce payable),
    // credit Purchases back.
    for (const vendorReturn of returns) {
      const totalMinor = vendorReturn.lineItems.reduce((sum, li) => sum + li.lineTotalMinor, 0);
      if (totalMinor === 0) continue;
      const amount = fromMinorUnits(totalMinor);
      const party = ExportService.partyName(vendorReturn.vendor);
      vouchers.push({
        type: "Credit Note",
        date: vendorReturn.returnDate,
        partyLedgerName: party,
        narration: vendorReturn.reason,
        entries: [
          { ledgerName: party, isDebit: true, amount },
          { ledgerName: PURCHASE_LEDGER, isDebit: false, amount },
        ],
      });
    }

    // Chronological order across all voucher types reads best in Tally's daybook.
    vouchers.sort((a, b) => a.date.getTime() - b.date.getTime());

    const stamp = new Date().toISOString().slice(0, 10);
    return {
      filename: `sitetrack-tally-${stamp}.xml`,
      xml: buildTallyXml(vouchers),
      voucherCount: vouchers.length,
    };
  }
}

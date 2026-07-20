import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface LedgerEntry {
  type: "DELIVERY" | "PAYMENT" | "RETURN";
  id: string;
  date: string;
  reference: string | null;
  siteName: string | null;
  /** Positive = increases what we owe (delivery); negative-conceptually = payment/return reduces it. */
  amountMinor: number;
  status?: string;
}

/**
 * Vendor financial position. The core numbers a contractor actually needs:
 *   delivered  (what the vendor supplied, at line-item totals)
 *   paid       (what we've paid that vendor)
 *   returned   (goods sent back, at COMPLETED-return line-item totals --
 *               PENDING/REJECTED returns don't move money yet)
 *   outstanding = delivered - paid - returned  (what we still owe)
 * All values in integer minor units, consistent with the rest of the app.
 */
@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  async vendorLedger(vendorId: string) {
    const vendor = await this.prisma.db.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor) throw new NotFoundException("Vendor not found");

    // Totals come from SQL aggregates so they're correct regardless of how
    // many entries exist; the entry list below is capped for display only.
    const [deliveredAgg, paidAgg, returnedAgg, deliveries, payments, returns] = await Promise.all([
      this.prisma.db.deliveryLineItem.aggregate({ where: { vendorId }, _sum: { lineTotalMinor: true } }),
      this.prisma.db.payment.aggregate({ where: { vendorId }, _sum: { amountMinor: true } }),
      this.prisma.db.vendorReturnLineItem.aggregate({
        where: { vendorId, vendorReturn: { status: "COMPLETED" } },
        _sum: { lineTotalMinor: true },
      }),
      this.prisma.db.delivery.findMany({
        where: { vendorId },
        include: { site: { select: { name: true } }, lineItems: { select: { lineTotalMinor: true } } },
        orderBy: { deliveryDate: "desc" },
        take: 500,
      }),
      this.prisma.db.payment.findMany({
        where: { vendorId },
        include: { site: { select: { name: true } } },
        orderBy: { paymentDate: "desc" },
        take: 500,
      }),
      this.prisma.db.vendorReturn.findMany({
        where: { vendorId },
        include: { site: { select: { name: true } }, lineItems: { select: { lineTotalMinor: true } } },
        orderBy: { returnDate: "desc" },
        take: 500,
      }),
    ]);

    const deliveredMinor = deliveredAgg._sum.lineTotalMinor ?? 0;
    const paidMinor = paidAgg._sum.amountMinor ?? 0;
    const returnedMinor = returnedAgg._sum.lineTotalMinor ?? 0;

    const deliveryEntries: LedgerEntry[] = deliveries.map((d) => ({
      type: "DELIVERY",
      id: d.id,
      date: d.deliveryDate.toISOString(),
      reference: d.referenceNumber ?? null,
      siteName: d.site?.name ?? null,
      amountMinor: d.lineItems.reduce((sum, li) => sum + li.lineTotalMinor, 0),
    }));

    const paymentEntries: LedgerEntry[] = payments.map((p) => ({
      type: "PAYMENT",
      id: p.id,
      date: p.paymentDate.toISOString(),
      reference: p.notes ?? null,
      siteName: p.site?.name ?? null,
      amountMinor: p.amountMinor,
    }));

    const returnEntries: LedgerEntry[] = returns.map((r) => ({
      type: "RETURN",
      id: r.id,
      date: r.returnDate.toISOString(),
      reference: r.reason ?? null,
      siteName: r.site?.name ?? null,
      amountMinor: r.lineItems.reduce((sum, li) => sum + li.lineTotalMinor, 0),
      status: r.status,
    }));

    const entries = [...deliveryEntries, ...paymentEntries, ...returnEntries].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return {
      vendor: { id: vendor.id, contactPerson: vendor.contactPerson, companyName: vendor.companyName },
      deliveredMinor,
      paidMinor,
      returnedMinor,
      outstandingMinor: deliveredMinor - paidMinor - returnedMinor,
      entries,
    };
  }

  /** Outstanding payable per vendor + org total, for the vendors list & dashboard. */
  async payables() {
    const [vendors, deliveredGroups, paymentsByVendor, returnedGroups] = await Promise.all([
      this.prisma.db.vendor.findMany({
        where: { isActive: true },
        select: { id: true, contactPerson: true, companyName: true },
      }),
      // Pure SQL-side aggregation over the denormalized vendorId on line
      // items (see schema comment) -- no full-table load into memory.
      this.prisma.db.deliveryLineItem.groupBy({
        by: ["vendorId"],
        _sum: { lineTotalMinor: true },
      }),
      this.prisma.db.payment.groupBy({ by: ["vendorId"], _sum: { amountMinor: true } }),
      this.prisma.db.vendorReturnLineItem.groupBy({
        by: ["vendorId"],
        where: { vendorReturn: { status: "COMPLETED" } },
        _sum: { lineTotalMinor: true },
      }),
    ]);

    const deliveredByVendor = new Map<string, number>();
    for (const row of deliveredGroups) {
      if (row.vendorId) deliveredByVendor.set(row.vendorId, row._sum.lineTotalMinor ?? 0);
    }

    const paidByVendor = new Map<string, number>();
    for (const row of paymentsByVendor) {
      paidByVendor.set(row.vendorId, row._sum.amountMinor ?? 0);
    }

    const returnedByVendor = new Map<string, number>();
    for (const row of returnedGroups) {
      returnedByVendor.set(row.vendorId, row._sum.lineTotalMinor ?? 0);
    }

    const rows = vendors.map((v) => {
      const deliveredMinor = deliveredByVendor.get(v.id) ?? 0;
      const paidMinor = paidByVendor.get(v.id) ?? 0;
      const returnedMinor = returnedByVendor.get(v.id) ?? 0;
      return {
        id: v.id,
        contactPerson: v.contactPerson,
        companyName: v.companyName,
        deliveredMinor,
        paidMinor,
        returnedMinor,
        outstandingMinor: deliveredMinor - paidMinor - returnedMinor,
      };
    });

    const totalOutstandingMinor = rows.reduce((sum, r) => sum + Math.max(0, r.outstandingMinor), 0);
    return { totalOutstandingMinor, vendors: rows };
  }
}

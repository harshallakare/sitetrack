import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { toMinorUnits } from "@sitetrack/shared-types";
import type { CreatePaymentInput } from "@sitetrack/shared-types";
import { writeAuditLog } from "../common/audit/write-audit-log";
import { isUniqueConstraintError } from "../common/prisma-errors";
import { insensitiveContains } from "../common/search";
import { PrismaService } from "../prisma/prisma.service";

const PAYMENT_INCLUDE = { account: true, vendor: true, site: true } as const;

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  list(params: { siteId?: string; search?: string; limit?: number; skip?: number } = {}) {
    const search = params.search?.trim();
    return this.prisma.db.payment.findMany({
      skip: Math.max(0, params.skip ?? 0),
      where: {
        ...(params.siteId ? { siteId: params.siteId } : {}),
        ...(search
          ? {
              OR: [
                { notes: insensitiveContains(search) },
                { vendor: { contactPerson: insensitiveContains(search) } },
                { vendor: { companyName: insensitiveContains(search) } },
              ],
            }
          : {}),
      },
      include: PAYMENT_INCLUDE,
      orderBy: { paymentDate: "desc" },
      take: Math.min(params.limit ?? 100, 500),
    });
  }

  get(id: string) {
    return this.prisma.db.payment.findUnique({ where: { id }, include: PAYMENT_INCLUDE });
  }

  async create(dto: CreatePaymentInput, createdByUserId: string) {
    const organizationId = this.prisma.organizationId;

    if (dto.idempotencyKey) {
      const existing = await this.prisma.db.payment.findFirst({
        where: { idempotencyKey: dto.idempotencyKey },
      });
      if (existing) return this.get(existing.id);
    }

    // Same ownership-through-scoped-fetch pattern as Deliveries: a raw FK
    // only proves the row exists, not that it belongs to this org.
    const site = await this.prisma.db.site.findUnique({ where: { id: dto.siteId } });
    if (!site) throw new NotFoundException("Site not found");

    const account = await this.prisma.db.account.findUnique({ where: { id: dto.accountId } });
    if (!account) throw new NotFoundException("Account not found");

    const vendor = await this.prisma.db.vendor.findUnique({ where: { id: dto.vendorId } });
    if (!vendor) throw new NotFoundException("Vendor not found");

    const amountMinor = toMinorUnits(dto.amount);
    if (amountMinor <= 0) {
      throw new BadRequestException("Payment amount must be greater than zero");
    }

    let payment;
    try {
      payment = await this.prisma.db.$transaction(async (tx) => {
        const created = await tx.payment.create({
          data: {
            organizationId,
            siteId: dto.siteId,
            accountId: dto.accountId,
            vendorId: dto.vendorId,
            amountMinor,
            paymentDate: dto.paymentDate,
            notes: dto.notes,
            createdByUserId,
            idempotencyKey: dto.idempotencyKey,
          },
        });

        await tx.account.update({
          where: { id: dto.accountId },
          data: { currentBalanceMinor: { decrement: amountMinor } },
        });

        await writeAuditLog(tx, {
          organizationId,
          entityType: "Payment",
          entityId: created.id,
          action: "CREATE",
          actorUserId: createdByUserId,
          after: created,
        });

        return created;
      });
    } catch (err) {
      // Concurrent retry with the same idempotency key: the tx rolled back
      // (so no double balance decrement) -- return the winner's payment.
      if (isUniqueConstraintError(err) && dto.idempotencyKey) {
        const existing = await this.prisma.db.payment.findFirst({
          where: { idempotencyKey: dto.idempotencyKey },
        });
        if (existing) return this.get(existing.id);
      }
      throw err;
    }

    return this.get(payment.id);
  }

  /**
   * Corrections: deleting a payment must restore the account balance it drew
   * down, atomically, and record the reversal in the audit trail. (Amount
   * corrections are done by delete + re-create, which keeps balance math
   * unambiguous.)
   */
  async remove(id: string, actorUserId: string) {
    const payment = await this.prisma.db.payment.findUnique({ where: { id } });
    if (!payment) throw new NotFoundException("Payment not found");

    await this.prisma.db.$transaction(async (tx) => {
      await tx.account.update({
        where: { id: payment.accountId },
        data: { currentBalanceMinor: { increment: payment.amountMinor } },
      });
      await tx.payment.delete({ where: { id } });
      await writeAuditLog(tx, {
        organizationId: payment.organizationId,
        entityType: "Payment",
        entityId: id,
        action: "DELETE",
        actorUserId,
        before: payment,
      });
    });

    return { success: true };
  }
}

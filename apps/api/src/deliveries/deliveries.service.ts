import { unlink } from "node:fs/promises";
import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { toMinorUnits } from "@sitetrack/shared-types";
import type { CreateDeliveryInput } from "@sitetrack/shared-types";
import { writeAuditLog } from "../common/audit/write-audit-log";
import { isUniqueConstraintError } from "../common/prisma-errors";
import { insensitiveContains } from "../common/search";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService, type UploadedFileLike } from "../storage/storage.service";

const DELIVERY_INCLUDE = {
  vendor: true,
  site: true,
  lineItems: { include: { item: true } },
  attachments: true,
} as const;

@Injectable()
export class DeliveriesService {
  private readonly logger = new Logger(DeliveriesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService
  ) {}

  list(params: { siteId?: string; search?: string; limit?: number; skip?: number } = {}) {
    const search = params.search?.trim();
    return this.prisma.db.delivery.findMany({
      skip: Math.max(0, params.skip ?? 0),
      where: {
        ...(params.siteId ? { siteId: params.siteId } : {}),
        ...(search
          ? {
              OR: [
                { referenceNumber: insensitiveContains(search) },
                { notes: insensitiveContains(search) },
                { vendor: { contactPerson: insensitiveContains(search) } },
                { vendor: { companyName: insensitiveContains(search) } },
              ],
            }
          : {}),
      },
      include: DELIVERY_INCLUDE,
      orderBy: { deliveryDate: "desc" },
      take: Math.min(params.limit ?? 100, 500),
    });
  }

  get(id: string) {
    return this.prisma.db.delivery.findUnique({ where: { id }, include: DELIVERY_INCLUDE });
  }

  async create(dto: CreateDeliveryInput, createdByUserId: string) {
    const organizationId = this.prisma.organizationId;

    // Idempotency: a client-generated key lets an offline-capture queue
    // safely retry a create without producing duplicate deliveries once
    // connectivity returns (see plan doc, section 7).
    if (dto.idempotencyKey) {
      const existing = await this.prisma.db.delivery.findFirst({
        where: { idempotencyKey: dto.idempotencyKey },
      });
      if (existing) return this.get(existing.id);
    }

    // Foreign keys alone don't prove tenant ownership -- a raw siteId/vendorId
    // FK constraint only checks the row exists somewhere, not that it
    // belongs to this org. Fetching through the scoped client is what
    // actually enforces that (findUnique returns null for cross-tenant ids).
    const site = await this.prisma.db.site.findUnique({ where: { id: dto.siteId } });
    if (!site) throw new NotFoundException("Site not found");

    const vendor = await this.prisma.db.vendor.findUnique({ where: { id: dto.vendorId } });
    if (!vendor) throw new NotFoundException("Vendor not found");

    const itemIds = [...new Set(dto.lineItems.map((li) => li.itemId))];
    const items = await this.prisma.db.item.findMany({ where: { id: { in: itemIds } } });
    if (items.length !== itemIds.length) {
      throw new BadRequestException("One or more items were not found in this organization");
    }

    let delivery;
    try {
      delivery = await this.prisma.db.$transaction(async (tx) => {
        const created = await tx.delivery.create({
          data: {
            organizationId,
            siteId: dto.siteId,
            vendorId: dto.vendorId,
            deliveryDate: dto.deliveryDate,
            referenceNumber: dto.referenceNumber,
            notes: dto.notes,
            status: dto.status ?? "RECEIVED",
            createdByUserId,
            idempotencyKey: dto.idempotencyKey,
          },
        });

        await tx.deliveryLineItem.createMany({
          data: dto.lineItems.map((line) => {
            const unitPriceMinor = toMinorUnits(line.unitPrice);
            return {
              organizationId,
              deliveryId: created.id,
              itemId: line.itemId,
              // Denormalized for the payables groupBy (see schema comment).
              vendorId: dto.vendorId,
              quantity: line.quantity,
              unitPriceMinor,
              lineTotalMinor: Math.round(line.quantity * unitPriceMinor),
              notes: line.notes,
            };
          }),
        });

        // Written via `tx` (not `this.prisma.db`) so it commits/rolls back
        // atomically with the delivery + line items above -- see prisma.service.ts.
        await writeAuditLog(tx, {
          organizationId,
          entityType: "Delivery",
          entityId: created.id,
          action: "CREATE",
          actorUserId: createdByUserId,
          after: created,
        });

        return created;
      });
    } catch (err) {
      // Concurrent retry with the same idempotency key: the pre-check above
      // raced another request and the @@unique(organizationId, idempotencyKey)
      // constraint fired. Return the winner's delivery -- idempotent, not a 500.
      if (isUniqueConstraintError(err) && dto.idempotencyKey) {
        const existing = await this.prisma.db.delivery.findFirst({
          where: { idempotencyKey: dto.idempotencyKey },
        });
        if (existing) return this.get(existing.id);
      }
      throw err;
    }

    return this.get(delivery.id);
  }

  async addAttachment(deliveryId: string, file: UploadedFileLike, uploadedByUserId: string) {
    const delivery = await this.prisma.db.delivery.findUnique({ where: { id: deliveryId } });
    if (!delivery) throw new NotFoundException("Delivery not found");

    const { storagePath } = await this.storage.save(file);

    // Strip control chars/quotes so the stored name can never break the
    // Content-Disposition header on download.
    // eslint-disable-next-line no-control-regex
    const safeFileName = file.originalname.replace(/[\x00-\x1f"\\]/g, "").slice(0, 200) || "attachment";

    return this.prisma.db.attachment.create({
      data: {
        organizationId: this.prisma.organizationId,
        deliveryId,
        fileName: safeFileName,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        storagePath,
        uploadedByUserId,
      },
    });
  }

  /**
   * Resolves an attachment for download. Fetching via the scoped client
   * (attachment carries organizationId) is what enforces that a caller can
   * only download files from their own org's deliveries.
   */
  /**
   * Corrections: deleting a delivery cascades to its line items and
   * attachments (schema onDelete: Cascade). No balance to reverse; the vendor
   * ledger recomputes on read. Amount corrections = delete + re-create.
   */
  async remove(id: string, actorUserId: string) {
    const delivery = await this.prisma.db.delivery.findUnique({ where: { id } });
    if (!delivery) throw new NotFoundException("Delivery not found");

    // Captured BEFORE the delete -- the DB cascade wipes the Attachment rows,
    // and without this the files would be orphaned on disk forever.
    const attachments = await this.prisma.db.attachment.findMany({
      where: { deliveryId: id },
      select: { storagePath: true },
    });

    await this.prisma.db.$transaction(async (tx) => {
      await tx.delivery.delete({ where: { id } });
      await writeAuditLog(tx, {
        organizationId: delivery.organizationId,
        entityType: "Delivery",
        entityId: id,
        action: "DELETE",
        actorUserId,
        before: delivery,
      });
    });

    // Best-effort, after commit: a failed unlink must not roll back the
    // delete (the DB is the source of truth; a stray file is just waste).
    for (const a of attachments) {
      await unlink(this.storage.getAbsolutePath(a.storagePath)).catch((err) =>
        this.logger.warn(`Failed to remove attachment file ${a.storagePath}: ${err?.message ?? err}`)
      );
    }

    return { success: true };
  }

  async getAttachmentForDownload(attachmentId: string) {
    const attachment = await this.prisma.db.attachment.findUnique({ where: { id: attachmentId } });
    if (!attachment) throw new NotFoundException("Attachment not found");
    return {
      absolutePath: this.storage.getAbsolutePath(attachment.storagePath),
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
    };
  }
}

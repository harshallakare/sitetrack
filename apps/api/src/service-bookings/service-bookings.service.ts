import { Injectable, NotFoundException } from "@nestjs/common";
import type { CreateServiceBookingInput, UpdateServiceBookingInput } from "@sitetrack/shared-types";
import { writeAuditLog } from "../common/audit/write-audit-log";
import { PrismaService } from "../prisma/prisma.service";

const BOOKING_INCLUDE = { service: true, site: true, vendor: true } as const;

@Injectable()
export class ServiceBookingsService {
  constructor(private readonly prisma: PrismaService) {}

  list(params: { siteId?: string } = {}) {
    return this.prisma.db.serviceBooking.findMany({
      where: params.siteId ? { siteId: params.siteId } : {},
      include: BOOKING_INCLUDE,
      orderBy: { bookingDate: "desc" },
    });
  }

  get(id: string) {
    return this.prisma.db.serviceBooking.findUnique({ where: { id }, include: BOOKING_INCLUDE });
  }

  async create(dto: CreateServiceBookingInput, createdByUserId: string) {
    const organizationId = this.prisma.organizationId;

    // Fetching through the scoped client (not a raw FK check) is what
    // actually proves tenant ownership -- see DeliveriesService.create.
    const site = await this.prisma.db.site.findUnique({ where: { id: dto.siteId } });
    if (!site) throw new NotFoundException("Site not found");

    const service = await this.prisma.db.service.findUnique({ where: { id: dto.serviceId } });
    if (!service) throw new NotFoundException("Service not found");

    if (dto.vendorId) {
      const vendor = await this.prisma.db.vendor.findUnique({ where: { id: dto.vendorId } });
      if (!vendor) throw new NotFoundException("Vendor not found");
    }

    const totalMinor = Math.round(dto.quantity * dto.rateMinor);

    const booking = await this.prisma.db.serviceBooking.create({
      data: {
        organizationId,
        siteId: dto.siteId,
        serviceId: dto.serviceId,
        vendorId: dto.vendorId,
        bookingDate: dto.bookingDate,
        quantity: dto.quantity,
        rateMinor: dto.rateMinor,
        totalMinor,
        notes: dto.notes,
        createdByUserId,
      },
    });

    await writeAuditLog(this.prisma.db, {
      organizationId,
      entityType: "ServiceBooking",
      entityId: booking.id,
      action: "CREATE",
      actorUserId: createdByUserId,
      after: booking,
    });

    return this.get(booking.id);
  }

  async update(id: string, dto: UpdateServiceBookingInput, actorUserId: string) {
    if (dto.vendorId) {
      const vendor = await this.prisma.db.vendor.findUnique({ where: { id: dto.vendorId } });
      if (!vendor) throw new NotFoundException("Vendor not found");
    }

    const before = await this.prisma.db.serviceBooking.findUnique({ where: { id } });
    if (!before) throw new NotFoundException("Service booking not found");

    const quantity = dto.quantity ?? before.quantity;
    const rateMinor = dto.rateMinor ?? before.rateMinor;
    const totalMinor = Math.round(quantity * rateMinor);

    const booking = await this.prisma.db.serviceBooking.update({
      where: { id },
      data: {
        vendorId: dto.vendorId,
        bookingDate: dto.bookingDate,
        quantity: dto.quantity,
        rateMinor: dto.rateMinor,
        totalMinor,
        status: dto.status,
        progressPercent: dto.progressPercent,
        notes: dto.notes,
        completedAt: dto.status === "COMPLETED" ? new Date() : dto.status ? null : undefined,
      },
    });

    await writeAuditLog(this.prisma.db, {
      organizationId: this.prisma.organizationId,
      entityType: "ServiceBooking",
      entityId: id,
      action: "UPDATE",
      actorUserId,
      before,
      after: booking,
    });

    return this.get(id);
  }

  async remove(id: string, actorUserId: string) {
    const before = await this.prisma.db.serviceBooking.findUnique({ where: { id } });
    if (!before) throw new NotFoundException("Service booking not found");

    await this.prisma.db.serviceBooking.delete({ where: { id } });

    await writeAuditLog(this.prisma.db, {
      organizationId: this.prisma.organizationId,
      entityType: "ServiceBooking",
      entityId: id,
      action: "DELETE",
      actorUserId,
      before,
    });

    return { id };
  }
}

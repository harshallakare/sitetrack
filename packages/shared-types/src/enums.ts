import { z } from "zod";

/**
 * These are modeled as plain strings (not Prisma `enum`) because Prisma enums
 * are unsupported on the SQLite connector, which must keep working as the
 * default local engine alongside Postgres/MySQL. Validation happens here,
 * at the application layer, on both the API and web sides.
 */

export const ROLES = ["OWNER", "SUPERVISOR", "ACCOUNTANT"] as const;
export const roleSchema = z.enum(ROLES);
export type Role = z.infer<typeof roleSchema>;

export const ACCOUNT_TYPES = ["CASH", "BANK", "WALLET"] as const;
export const accountTypeSchema = z.enum(ACCOUNT_TYPES);
export type AccountType = z.infer<typeof accountTypeSchema>;

export const DELIVERY_STATUSES = ["PENDING", "RECEIVED", "DISPUTED"] as const;
export const deliveryStatusSchema = z.enum(DELIVERY_STATUSES);
export type DeliveryStatus = z.infer<typeof deliveryStatusSchema>;

export const SERVICE_BOOKING_STATUSES = ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;
export const serviceBookingStatusSchema = z.enum(SERVICE_BOOKING_STATUSES);
export type ServiceBookingStatus = z.infer<typeof serviceBookingStatusSchema>;

export const UNITS_OF_MEASURE = [
  "BAG",
  "CUBIC_METER",
  "SQUARE_METER",
  "KILOGRAM",
  "NUMBER",
  "LITER",
  "METER",
  "TON",
] as const;
export const unitOfMeasureSchema = z.enum(UNITS_OF_MEASURE);
export type UnitOfMeasure = z.infer<typeof unitOfMeasureSchema>;

export const AUDIT_ACTIONS = ["CREATE", "UPDATE", "DELETE"] as const;
export const auditActionSchema = z.enum(AUDIT_ACTIONS);
export type AuditAction = z.infer<typeof auditActionSchema>;

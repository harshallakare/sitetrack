import { z } from "zod";
import { serviceBookingStatusSchema } from "../enums";

export const createServiceBookingSchema = z.object({
  siteId: z.string().min(1),
  serviceId: z.string().min(1),
  vendorId: z.string().min(1).optional(),
  bookingDate: z.coerce.date(),
  quantity: z.number().positive(),
  rateMinor: z.number().int().nonnegative(),
  notes: z.string().max(400).optional(),
});
export type CreateServiceBookingInput = z.infer<typeof createServiceBookingSchema>;

export const updateServiceBookingSchema = z.object({
  vendorId: z.string().min(1).optional(),
  bookingDate: z.coerce.date().optional(),
  quantity: z.number().positive().optional(),
  rateMinor: z.number().int().nonnegative().optional(),
  status: serviceBookingStatusSchema.optional(),
  progressPercent: z.number().int().min(0).max(100).optional(),
  notes: z.string().max(400).optional(),
});
export type UpdateServiceBookingInput = z.infer<typeof updateServiceBookingSchema>;

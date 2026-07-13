import { z } from "zod";
import { deliveryStatusSchema } from "../enums";

export const deliveryLineItemSchema = z.object({
  itemId: z.string().min(1),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().nonnegative(),
  notes: z.string().max(400).optional(),
});
export type DeliveryLineItemInput = z.infer<typeof deliveryLineItemSchema>;

export const createDeliverySchema = z.object({
  siteId: z.string().min(1),
  vendorId: z.string().min(1),
  deliveryDate: z.coerce.date(),
  referenceNumber: z.string().max(120).optional(),
  notes: z.string().max(1000).optional(),
  status: deliveryStatusSchema.optional(),
  lineItems: z.array(deliveryLineItemSchema).min(1),
  idempotencyKey: z.string().min(1).max(200).optional(),
});
export type CreateDeliveryInput = z.infer<typeof createDeliverySchema>;

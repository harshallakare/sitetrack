import { z } from "zod";
import { vendorReturnStatusSchema } from "../enums";

export const vendorReturnLineItemSchema = z.object({
  itemId: z.string().min(1),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().nonnegative(),
});
export type VendorReturnLineItemInput = z.infer<typeof vendorReturnLineItemSchema>;

export const createVendorReturnSchema = z.object({
  siteId: z.string().min(1),
  vendorId: z.string().min(1),
  returnDate: z.coerce.date(),
  reason: z.string().max(400).optional(),
  notes: z.string().max(1000).optional(),
  lineItems: z.array(vendorReturnLineItemSchema).min(1),
});
export type CreateVendorReturnInput = z.infer<typeof createVendorReturnSchema>;

export const updateVendorReturnSchema = z.object({
  status: vendorReturnStatusSchema.optional(),
  reason: z.string().max(400).optional(),
  notes: z.string().max(1000).optional(),
});
export type UpdateVendorReturnInput = z.infer<typeof updateVendorReturnSchema>;

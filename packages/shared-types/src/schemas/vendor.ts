import { z } from "zod";

export const createVendorSchema = z.object({
  contactPerson: z.string().min(1).max(160),
  companyName: z.string().max(200).optional(),
  email: z.string().email().max(200).optional().or(z.literal("")),
  phone: z.string().max(40).optional(),
  address: z.string().max(400).optional(),
  paymentDetails: z.string().max(1000).optional(),
  tagNames: z.array(z.string().min(1).max(60)).max(20).optional(),
});
export type CreateVendorInput = z.infer<typeof createVendorSchema>;

export const updateVendorSchema = createVendorSchema.partial().extend({
  isActive: z.boolean().optional(),
});
export type UpdateVendorInput = z.infer<typeof updateVendorSchema>;

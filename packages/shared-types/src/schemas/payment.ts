import { z } from "zod";

export const createPaymentSchema = z.object({
  siteId: z.string().min(1),
  accountId: z.string().min(1),
  vendorId: z.string().min(1),
  amount: z.coerce.number().positive(),
  paymentDate: z.coerce.date(),
  notes: z.string().max(1000).optional(),
  idempotencyKey: z.string().min(1).max(200).optional(),
});
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;

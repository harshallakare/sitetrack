import { z } from "zod";
import { accountTypeSchema } from "../enums";

export const createAccountSchema = z.object({
  name: z.string().min(1).max(160),
  type: accountTypeSchema,
  siteId: z.string().min(1).optional(),
  openingBalance: z.coerce.number().default(0),
  description: z.string().max(400).optional(),
});
export type CreateAccountInput = z.infer<typeof createAccountSchema>;

export const updateAccountSchema = createAccountSchema.partial().extend({
  isActive: z.boolean().optional(),
});
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;

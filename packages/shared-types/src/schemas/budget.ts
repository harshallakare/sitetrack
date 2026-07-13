import { z } from "zod";

export const upsertBudgetLineSchema = z.object({
  category: z.string().min(1).max(80),
  plannedAmount: z.coerce.number().nonnegative(),
});
export type UpsertBudgetLineInput = z.infer<typeof upsertBudgetLineSchema>;

import { z } from "zod";

export const createSiteSchema = z.object({
  name: z.string().min(1).max(160),
  address: z.string().max(400).optional(),
  plannedSqft: z.coerce.number().nonnegative().optional(),
  unitCount: z.coerce.number().int().nonnegative().optional(),
});
export type CreateSiteInput = z.infer<typeof createSiteSchema>;

export const updateSiteSchema = createSiteSchema.partial().extend({
  isActive: z.boolean().optional(),
});
export type UpdateSiteInput = z.infer<typeof updateSiteSchema>;

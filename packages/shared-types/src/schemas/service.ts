import { z } from "zod";
import { unitOfMeasureSchema } from "../enums";

export const createServiceSchema = z.object({
  name: z.string().min(1).max(160),
  unitOfMeasure: unitOfMeasureSchema,
  category: z.string().max(80).optional(),
  standardRateMinor: z.number().int().nonnegative().optional(),
  description: z.string().max(400).optional(),
});
export type CreateServiceInput = z.infer<typeof createServiceSchema>;

export const updateServiceSchema = createServiceSchema.partial().extend({
  isActive: z.boolean().optional(),
});
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;

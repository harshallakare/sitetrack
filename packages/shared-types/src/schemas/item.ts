import { z } from "zod";
import { unitOfMeasureSchema } from "../enums";

export const createItemSchema = z.object({
  name: z.string().min(1).max(160),
  unitOfMeasure: unitOfMeasureSchema,
  category: z.string().max(80).optional(),
  description: z.string().max(400).optional(),
  tagNames: z.array(z.string().min(1).max(60)).max(20).optional(),
});
export type CreateItemInput = z.infer<typeof createItemSchema>;

export const updateItemSchema = createItemSchema.partial().extend({
  isActive: z.boolean().optional(),
});
export type UpdateItemInput = z.infer<typeof updateItemSchema>;

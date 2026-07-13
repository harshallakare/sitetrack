import { z } from "zod";

export const setOrganizationPlanSchema = z.object({
  planSlug: z.string().min(1).max(60),
});
export type SetOrganizationPlanInput = z.infer<typeof setOrganizationPlanSchema>;

import { z } from "zod";

export const setOrganizationActiveSchema = z.object({
  isActive: z.boolean(),
});
export type SetOrganizationActiveInput = z.infer<typeof setOrganizationActiveSchema>;

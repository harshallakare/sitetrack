import { z } from "zod";

export const setOrganizationActiveSchema = z.object({
  isActive: z.boolean(),
});
export type SetOrganizationActiveInput = z.infer<typeof setOrganizationActiveSchema>;

// Restoring overwrites the entire database for every organization on this
// deployment -- the exact-match literal (not just a truthy flag) is a
// deliberate speed bump against a scripted or fat-fingered request.
export const restoreDatabaseSchema = z.object({
  confirm: z.literal("RESTORE"),
});
export type RestoreDatabaseInput = z.infer<typeof restoreDatabaseSchema>;

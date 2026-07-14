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

// Creates a dedicated platform-admin account -- never shared with a
// customer login, same rule the create-platform-admin.ts CLI script
// enforces (rejects if the email already belongs to any user).
export const createPlatformAdminSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().max(200),
  password: z.string().min(8).max(200),
});
export type CreatePlatformAdminInput = z.infer<typeof createPlatformAdminSchema>;

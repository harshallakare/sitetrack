import { z } from "zod";
import { roleSchema } from "../enums";

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

// Admin adds a person to an organization directly (no invite email/token
// flow). If the email already belongs to a user, name/password are ignored
// server-side and they're just added as a member -- same "ignored for an
// existing account" convention as acceptInvitationSchema.
export const addOrganizationUserSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  email: z.string().email().max(200),
  password: z.string().min(8).max(200).optional(),
  role: roleSchema,
});
export type AddOrganizationUserInput = z.infer<typeof addOrganizationUserSchema>;

// Admin editing another user's profile fields -- never password or
// isPlatformAdmin here, those have their own dedicated, more deliberate
// endpoints (reset-password below; isPlatformAdmin has no update route at all).
export const updateUserSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  email: z.string().email().max(200).optional(),
  phone: z.string().max(30).nullable().optional(),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const resetUserPasswordSchema = z.object({
  password: z.string().min(8).max(200),
});
export type ResetUserPasswordInput = z.infer<typeof resetUserPasswordSchema>;

// Admin onboards a brand-new customer directly (organization + owner
// account together) -- the same shape as self-serve /auth/register,
// minus issuing a session, since the admin isn't logging in as them.
export const createOrganizationSchema = z.object({
  organizationName: z.string().min(1).max(200),
  ownerName: z.string().min(1).max(120),
  ownerEmail: z.string().email().max(200),
  ownerPassword: z.string().min(8).max(200),
});
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;

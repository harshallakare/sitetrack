import { z } from "zod";
import { roleSchema } from "../enums";

export const inviteMemberSchema = z.object({
  email: z.string().email().max(200),
  role: roleSchema,
});
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

export const changeMemberRoleSchema = z.object({
  role: roleSchema,
});
export type ChangeMemberRoleInput = z.infer<typeof changeMemberRoleSchema>;

// Public accept flow. If the invited email already has an account, name +
// password are ignored (they just join). For a brand-new user, both are
// required to create the account.
export const acceptInvitationSchema = z.object({
  token: z.string().min(1),
  name: z.string().min(1).max(120).optional(),
  password: z.string().min(8).max(200).optional(),
});
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { inviteMemberSchema, ROLES, type InviteMemberInput, type Role } from "@sitetrack/shared-types";
import { Copy, Trash2, UserPlus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { clientFetch } from "@/lib/client-api";
import { usePreferences } from "@/components/providers/preferences-provider";

export interface Member {
  id: string;
  role: Role;
  user: { id: string; name: string; email: string };
}
export interface Invitation {
  id: string;
  email: string;
  role: Role;
  token: string;
  expiresAt: string;
}

export function TeamManager({
  members,
  invitations,
  currentUserId,
  isOwner,
}: {
  members: Member[];
  invitations: Invitation[];
  currentUserId: string;
  isOwner: boolean;
}) {
  const router = useRouter();
  const { t } = usePreferences();
  const [error, setError] = React.useState<string | null>(null);
  const [copiedToken, setCopiedToken] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InviteMemberInput>({ resolver: zodResolver(inviteMemberSchema), defaultValues: { role: "SUPERVISOR" } });

  async function onInvite(values: InviteMemberInput) {
    setError(null);
    try {
      await clientFetch("/members/invitations", { method: "POST", body: JSON.stringify(values) });
      reset({ email: "", role: "SUPERVISOR" });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to invite");
    }
  }

  async function changeRole(membershipId: string, role: Role) {
    setError(null);
    try {
      await clientFetch(`/members/${membershipId}/role`, { method: "PATCH", body: JSON.stringify({ role }) });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change role");
    }
  }

  async function removeMember(membershipId: string) {
    if (!window.confirm("Remove this member from the organization?")) return;
    setError(null);
    try {
      await clientFetch(`/members/${membershipId}`, { method: "DELETE" });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove");
    }
  }

  async function revokeInvite(id: string) {
    setError(null);
    try {
      await clientFetch(`/members/invitations/${id}`, { method: "DELETE" });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke");
    }
  }

  function copyLink(token: string) {
    const url = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">{t("team.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("team.subtitle")}</p>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {isOwner && (
        <section className="rounded-lg border border-border p-4">
          <h2 className="mb-3 flex items-center gap-2 font-semibold">
            <UserPlus className="h-4 w-4" /> {t("team.invite")}
          </h2>
          <form onSubmit={handleSubmit(onInvite)} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="person@example.com" {...register("email")} />
              {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="role">Role</Label>
              <select id="role" className="flex h-10 rounded-md border border-border bg-transparent px-3 py-2 text-sm" {...register("role")}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {t(`role.${r}` as const)}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Sending..." : "Send Invite"}
            </Button>
          </form>
        </section>
      )}

      <section className="rounded-lg border border-border p-4">
        <h2 className="mb-3 font-semibold">{t("team.members")}</h2>
        <div className="flex flex-col gap-2">
          {members.map((m) => (
            <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 last:border-0">
              <div>
                <div className="font-medium">
                  {m.user.name}
                  {m.user.id === currentUserId && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
                </div>
                <div className="text-sm text-muted-foreground">{m.user.email}</div>
              </div>
              <div className="flex items-center gap-2">
                {isOwner && m.user.id !== currentUserId ? (
                  <>
                    <select
                      className="h-9 rounded-md border border-border bg-transparent px-2 text-sm"
                      value={m.role}
                      onChange={(e) => changeRole(m.id, e.target.value as Role)}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {t(`role.${r}` as const)}
                        </option>
                      ))}
                    </select>
                    <Button variant="ghost" size="icon" onClick={() => removeMember(m.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <span className="rounded-full bg-muted px-3 py-1 text-sm">{t(`role.${m.role}` as const)}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {isOwner && invitations.length > 0 && (
        <section className="rounded-lg border border-border p-4">
          <h2 className="mb-3 font-semibold">{t("team.pendingInvites")}</h2>
          <div className="flex flex-col gap-2">
            {invitations.map((inv) => (
              <div key={inv.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 last:border-0">
                <div>
                  <div className="font-medium">{inv.email}</div>
                  <div className="text-sm text-muted-foreground">
                    {t(`role.${inv.role}` as const)} · expires {new Date(inv.expiresAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => copyLink(inv.token)}>
                    {copiedToken === inv.token ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copiedToken === inv.token ? "Copied" : "Copy link"}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => revokeInvite(inv.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

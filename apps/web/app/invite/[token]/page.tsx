import Link from "next/link";
import { AcceptInviteForm } from "./accept-form";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

interface InvitationLookup {
  email: string;
  role: string;
  organizationName: string;
  requiresAccountSetup: boolean;
}

const ROLE_LABEL: Record<string, string> = { OWNER: "Owner", SUPERVISOR: "Supervisor", ACCOUNTANT: "Accountant" };

export default async function InviteAcceptPage({ params }: { params: { token: string } }) {
  // Public endpoint -- no auth. Fetched server-side so an invalid/expired
  // token renders a clean message rather than exposing the API.
  const res = await fetch(`${API_URL}/members/invitations/lookup?token=${encodeURIComponent(params.token)}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md rounded-lg border border-border p-6 text-center">
          <h1 className="text-xl font-bold">Invitation unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This invitation is invalid, expired, or has already been used.
          </p>
          <Link href="/login" className="mt-4 inline-block text-sm text-primary underline-offset-4 hover:underline">
            Go to sign in
          </Link>
        </div>
      </main>
    );
  }

  const invitation = (await res.json()) as InvitationLookup;

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-lg border border-border p-6">
        <h1 className="text-xl font-bold">You&apos;re invited</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Join <span className="font-medium text-foreground">{invitation.organizationName}</span> as{" "}
          <span className="font-medium text-foreground">{ROLE_LABEL[invitation.role] ?? invitation.role}</span>.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{invitation.email}</p>
        <div className="mt-4">
          <AcceptInviteForm token={params.token} requiresAccountSetup={invitation.requiresAccountSetup} />
        </div>
      </div>
    </main>
  );
}

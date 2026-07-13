import { serverFetch } from "@/lib/server-api";
import { AppShell } from "@/components/layout/app-shell";

interface OrganizationRow {
  id: string;
  name: string;
  slug: string;
}

interface MembershipRow {
  organizationId: string;
  role: string;
  organization: OrganizationRow;
}

interface CurrentUser {
  id: string;
  name: string;
  email: string;
  isPlatformAdmin: boolean;
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [me, memberships, currentUser] = await Promise.all([
    serverFetch<OrganizationRow>("/organizations/me"),
    serverFetch<MembershipRow[]>("/organizations/mine"),
    serverFetch<CurrentUser>("/auth/me"),
  ]);

  const organizations = memberships.map((m) => ({
    id: m.organizationId,
    name: m.organization.name,
    slug: m.organization.slug,
    role: m.role,
  }));

  const activeOrganization = organizations.find((o) => o.id === me.id) ?? organizations[0];

  return (
    <AppShell
      activeOrganization={activeOrganization}
      organizations={organizations}
      userName={currentUser.name}
      isPlatformAdmin={currentUser.isPlatformAdmin}
    >
      {children}
    </AppShell>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { adminServerFetch } from "@/lib/admin-server-api";
import { ShieldCheck, LayoutDashboard, Building2, Users, ArrowLeft, Bell, CreditCard, Database } from "lucide-react";
import { AdminLogoutButton } from "./admin-logout-button";

interface CurrentAdmin {
  id: string;
  name: string;
  email: string;
  isPlatformAdmin: boolean;
}

export default async function PlatformAdminLayout({ children }: { children: React.ReactNode }) {
  // adminServerFetch reads ONLY the st_admin_access cookie -- a customer
  // with a perfectly valid tenant session but no separate admin login has
  // no such cookie at all, so this always redirects them to /admin/login,
  // never renders admin content based on their tenant session.
  const me = await adminServerFetch<CurrentAdmin>("/admin-auth/me").catch(() => null);

  if (!me?.isPlatformAdmin) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-red-900/30 bg-neutral-950 text-neutral-100">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-red-400" />
            <span className="font-bold">Platform Admin</span>
            <span className="rounded-full bg-red-900/40 px-2 py-0.5 text-xs text-red-300">
              cross-tenant
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-neutral-400 sm:inline">{me.email}</span>
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 text-sm text-neutral-400 hover:text-neutral-100"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to app
            </Link>
            <AdminLogoutButton />
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 px-4 pb-2 md:px-6">
          <AdminNavLink href="/admin" icon={LayoutDashboard} label="Overview" />
          <AdminNavLink href="/admin/organizations" icon={Building2} label="Organizations" />
          <AdminNavLink href="/admin/users" icon={Users} label="Users" />
          <AdminNavLink href="/admin/notifications" icon={Bell} label="Notifications" />
          <AdminNavLink href="/admin/payment-gateways" icon={CreditCard} label="Payments" />
          <AdminNavLink href="/admin/database" icon={Database} label="Database" />
        </nav>
      </header>
      <main className="mx-auto max-w-6xl p-4 md:p-6">{children}</main>
    </div>
  );
}

function AdminNavLink({ href, icon: Icon, label }: { href: string; icon: typeof LayoutDashboard; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 rounded-t-md px-3 py-1.5 text-sm text-neutral-400 hover:bg-neutral-900 hover:text-neutral-100"
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Menu, X, ChevronDown, LogOut, HardHat, ShieldCheck, Sun, Moon, Languages } from "lucide-react";
import { cn } from "@/lib/utils";
import { clientFetch } from "@/lib/client-api";
import { usePreferences } from "@/components/providers/preferences-provider";
import { NAV_ITEMS } from "./nav-items";

interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
  role: string;
}

export function AppShell({
  children,
  activeOrganization,
  organizations,
  userName,
  isPlatformAdmin,
}: {
  children: React.ReactNode;
  activeOrganization: OrganizationSummary;
  organizations: OrganizationSummary[];
  userName: string;
  isPlatformAdmin?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const { t, theme, toggleTheme, locale, setLocale } = usePreferences();

  async function handleSwitchOrg(organizationId: string) {
    if (organizationId === activeOrganization.id) return;
    await clientFetch("/auth/switch-organization", {
      method: "POST",
      body: JSON.stringify({ organizationId }),
    });
    router.refresh();
    router.push("/dashboard");
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const navLinks = (onNavigate?: () => void) => (
    <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname?.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted"
            )}
          >
            <Icon className="h-4 w-4" />
            {t(item.labelKey)}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-border md:flex md:flex-col">
        <div className="flex items-center gap-2 border-b border-border px-4 py-4">
          <HardHat className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold">SiteTrack</span>
        </div>
        {navLinks()}
      </aside>

      {/* Mobile top bar + drawer */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <HardHat className="h-5 w-5 text-primary" />
          <span className="font-bold">SiteTrack</span>
        </div>
        <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
          <Dialog.Trigger asChild>
            <button className="rounded-md p-2 hover:bg-muted" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50" />
            <Dialog.Content className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-background">
              <div className="flex items-center justify-between border-b border-border px-4 py-4">
                <span className="text-lg font-bold">SiteTrack</span>
                <Dialog.Close asChild>
                  <button className="rounded-md p-2 hover:bg-muted" aria-label="Close menu">
                    <X className="h-5 w-5" />
                  </button>
                </Dialog.Close>
              </div>
              {navLinks(() => setMobileOpen(false))}
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>

      <div className="flex flex-1 flex-col">
        {/* Top bar: org switcher + user + logout */}
        <header className="flex items-center justify-end gap-3 border-b border-border px-4 py-3 md:px-6">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted">
                {activeOrganization.name}
                <span className="text-xs text-muted-foreground">({activeOrganization.role})</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                className="z-50 min-w-[220px] rounded-md border border-border bg-card p-1 shadow-md"
              >
                {organizations.map((org) => (
                  <DropdownMenu.Item
                    key={org.id}
                    onSelect={() => handleSwitchOrg(org.id)}
                    className={cn(
                      "cursor-pointer rounded-sm px-3 py-2 text-sm outline-none hover:bg-muted",
                      org.id === activeOrganization.id && "font-semibold"
                    )}
                  >
                    {org.name}
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>

          <span className="hidden text-sm text-muted-foreground sm:inline">{userName}</span>

          {/* Language switcher */}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                className="flex items-center gap-1 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={t("common.language")}
              >
                <Languages className="h-4 w-4" />
                <span className="uppercase">{locale}</span>
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                className="z-50 min-w-[140px] rounded-md border border-border bg-card p-1 shadow-md"
              >
                <DropdownMenu.Item
                  onSelect={() => setLocale("en")}
                  className={cn(
                    "cursor-pointer rounded-sm px-3 py-2 text-sm outline-none hover:bg-muted",
                    locale === "en" && "font-semibold"
                  )}
                >
                  English
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onSelect={() => setLocale("hi")}
                  className={cn(
                    "cursor-pointer rounded-sm px-3 py-2 text-sm outline-none hover:bg-muted",
                    locale === "hi" && "font-semibold"
                  )}
                >
                  हिन्दी
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onSelect={() => setLocale("mr")}
                  className={cn(
                    "cursor-pointer rounded-sm px-3 py-2 text-sm outline-none hover:bg-muted",
                    locale === "mr" && "font-semibold"
                  )}
                >
                  मराठी
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="flex items-center rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={theme === "dark" ? t("common.lightMode") : t("common.darkMode")}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {isPlatformAdmin && (
            <Link
              href="/admin/login"
              className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <ShieldCheck className="h-4 w-4" />
              <span className="hidden sm:inline">{t("action.platformAdmin")}</span>
            </Link>
          )}

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">{t("action.logout")}</span>
          </button>
        </header>

        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Building2,
  Users,
  Package,
  Truck,
  Wallet,
  ArrowLeftRight,
  UserPlus,
  History,
  CreditCard,
} from "lucide-react";
import type { TranslationKey } from "@/lib/i18n/dictionaries";

export interface NavItem {
  href: string;
  labelKey: TranslationKey;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { href: "/sites", labelKey: "nav.sites", icon: Building2 },
  { href: "/vendors", labelKey: "nav.vendors", icon: Users },
  { href: "/items", labelKey: "nav.items", icon: Package },
  { href: "/deliveries", labelKey: "nav.deliveries", icon: Truck },
  { href: "/accounts", labelKey: "nav.accounts", icon: Wallet },
  { href: "/payments", labelKey: "nav.payments", icon: ArrowLeftRight },
  { href: "/team", labelKey: "nav.team", icon: UserPlus },
  { href: "/activity", labelKey: "nav.activity", icon: History },
  { href: "/billing", labelKey: "nav.billing", icon: CreditCard },
];

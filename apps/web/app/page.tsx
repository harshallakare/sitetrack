import Link from "next/link";
import {
  Building2,
  Truck,
  Wallet,
  Users,
  BarChart3,
  ShieldCheck,
  Globe,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const FEATURES = [
  {
    icon: Building2,
    title: "Sites & Vendors",
    description:
      "Track every construction site under one organization, with a shared vendor and item catalog across all of them.",
  },
  {
    icon: Truck,
    title: "Deliveries",
    description:
      "Log multi-line deliveries with photo attachments, and see delivered quantities and average prices roll up automatically.",
  },
  {
    icon: Wallet,
    title: "Accounts & Payments",
    description: "Track cash and bank accounts with running balances as payments go out to vendors.",
  },
  {
    icon: BarChart3,
    title: "Vendor Ledger & Budgets",
    description: "See outstanding balances per vendor, and budget-vs-actual for every site, not just the total spend.",
  },
  {
    icon: Users,
    title: "Team & Roles",
    description: "Invite your team with Owner, Supervisor, or Accountant roles -- everyone sees only what they need.",
  },
  {
    icon: ShieldCheck,
    title: "Full Activity Log",
    description: "Every change is recorded -- see who approved a delivery or edited a payment, and when.",
  },
];

const PLANS = [
  {
    name: "Free",
    price: "₹0",
    period: "forever",
    description: "Get started with a single site.",
    features: ["1 site", "Unlimited vendors & items", "Unlimited team members", "Full activity log"],
    cta: "Get Started Free",
    highlighted: false,
  },
  {
    name: "Unlimited",
    price: "₹999",
    period: "/month",
    description: "For contractors running multiple sites at once.",
    features: ["Unlimited sites", "Everything in Free", "Vendor ledger & budget tracking", "Priority support"],
    cta: "Upgrade Anytime",
    highlighted: true,
  },
];

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-lg font-bold">SiteTrack</span>
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/register">Get Started</Link>
            </Button>
          </nav>
        </div>
      </header>

      <section className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-6 py-20 text-center sm:py-28">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Construction site expenses, vendors, and payments -- in one place
        </h1>
        <p className="text-lg text-muted-foreground">
          SiteTrack replaces the spreadsheet-and-WhatsApp routine with a single system your whole team can use --
          multi-site, multi-tenant, and built for how construction actually gets billed and paid.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/register">Get Started Free</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </section>

      <section className="border-t border-border bg-muted/30">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold sm:text-3xl">Everything a site office needs</h2>
            <p className="mt-2 text-muted-foreground">No modules to configure -- it all works together from day one.</p>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <Card key={feature.title}>
                <CardHeader>
                  <feature.icon className="h-8 w-8 text-primary" />
                  <CardTitle className="mt-2">{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold sm:text-3xl">Simple pricing</h2>
            <p className="mt-2 text-muted-foreground">Start free with one site. Upgrade when you need more.</p>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {PLANS.map((plan) => (
              <Card key={plan.name} className={plan.highlighted ? "border-primary shadow-md" : undefined}>
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    <span className="text-sm text-muted-foreground">{plan.period}</span>
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <ul className="flex flex-col gap-2 text-sm">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <Check className="h-4 w-4 shrink-0 text-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button asChild variant={plan.highlighted ? "default" : "outline"}>
                    <Link href="/register">{plan.cta}</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-muted/30">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-6 py-10 text-center text-sm text-muted-foreground sm:flex-row sm:justify-center sm:gap-6">
          <span className="flex items-center gap-1.5">
            <Globe className="h-4 w-4" /> Available in English and Hindi
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4" /> Your data is isolated per organization
          </span>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} SiteTrack
        </div>
      </footer>
    </main>
  );
}

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
  Sparkles,
  HardHat,
  Calculator,
  ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const BENEFITS = [
  {
    icon: ShieldCheck,
    title: "Fewer surprises at month-end",
    description:
      "Vendor ledgers and site budgets stay current as deliveries and payments happen -- not after someone finally updates a spreadsheet.",
  },
  {
    icon: Users,
    title: "One shared record, not five chat threads",
    description:
      "Owner, supervisor, and accountant all see the same numbers live, on the same site -- no more forwarding screenshots to reconcile who's right.",
  },
  {
    icon: ClipboardList,
    title: "Nothing gets lost",
    description:
      "Every delivery, payment, and approval is logged with a full activity trail, so a dispute is a scroll back through history, not a guess.",
  },
];

const PERSONAS = [
  {
    icon: HardHat,
    eyebrow: "OWNERS",
    title: "Every site, one view",
    description: "See spend and vendor balances across every site your organization runs, without chasing anyone for an update.",
  },
  {
    icon: ClipboardList,
    eyebrow: "SUPERVISORS",
    title: "Fast entry, from the field",
    description: "Log a delivery with a photo in seconds from your phone as it arrives on site -- no end-of-day paperwork.",
  },
  {
    icon: Calculator,
    eyebrow: "ACCOUNTANTS",
    title: "Month-end without the chase",
    description: "Reconcile vendor ledgers and close the books from live totals -- no chasing slips or rebuilding spreadsheets.",
  },
];

const STEPS = [
  {
    number: "01",
    title: "Create your organization",
    description: "Sign up and name your organization -- no setup call, no onboarding project.",
  },
  {
    number: "02",
    title: "Add your sites and vendors",
    description: "Every site shares one vendor and item catalog, so nothing needs re-entering per site.",
  },
  {
    number: "03",
    title: "Track deliveries and payments",
    description: "Log what came in and what went out, and watch vendor balances and budgets update automatically.",
  },
];

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

const FAQS = [
  {
    question: "Is my organization's data isolated from other organizations?",
    answer:
      "Yes. Every organization's data is isolated at the database level -- no site, vendor, delivery, or payment record is ever reachable across tenants.",
  },
  {
    question: "Can I change plans or cancel anytime?",
    answer: "Yes -- upgrade or cancel anytime from your billing page. There are no lock-in contracts.",
  },
  {
    question: "What happens if I go over the Free plan's 1 site?",
    answer:
      "You'll be prompted to upgrade to Unlimited before creating another site. Nothing on your existing site is disabled or deleted.",
  },
  {
    question: "Do you support languages other than English?",
    answer: "Yes -- the app is available in English and Hindi today, with more languages planned.",
  },
];

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-lg font-bold">SiteTrack</span>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground sm:flex">
            <a href="#features" className="hover:text-foreground">
              Features
            </a>
            <a href="#pricing" className="hover:text-foreground">
              Pricing
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/register">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage: "radial-gradient(hsl(var(--foreground)) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            maskImage: "radial-gradient(ellipse 60% 50% at 50% 0%, black 40%, transparent 100%)",
          }}
        />
        <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-6 px-6 py-20 text-center sm:py-28">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            Multi-tenant construction site management
          </span>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Construction expenses, organized <span className="text-primary">by site</span> -- not by spreadsheet
          </h1>
          <p className="text-lg text-muted-foreground">
            Replace the WhatsApp groups and shared spreadsheets with one system every owner, supervisor, and
            accountant can trust -- multi-site, multi-tenant, and built for how construction actually gets billed and
            paid.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/register">Get Started Free</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Free for your first site · No credit card required</p>
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <div className="mb-10">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Why teams switch</p>
            <h2 className="mt-1 text-2xl font-bold sm:text-3xl">Stop reconciling. Start knowing.</h2>
            <p className="mt-2 text-muted-foreground">
              This isn&apos;t generic accounting software -- it&apos;s built for how money actually moves on a
              construction site.
            </p>
          </div>
          <div className="flex flex-col gap-4">
            {BENEFITS.map((benefit) => (
              <div key={benefit.title} className="flex gap-4 rounded-lg border border-border p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
                  <benefit.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{benefit.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-muted/30">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="mb-10 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Who it&apos;s for</p>
            <h2 className="mt-1 text-2xl font-bold sm:text-3xl">Built for everyone on the site</h2>
            <p className="mt-2 text-muted-foreground">One shared organization, three roles -- everyone sees what they need.</p>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {PERSONAS.map((persona) => (
              <Card key={persona.eyebrow}>
                <CardHeader>
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-foreground text-background">
                    <persona.icon className="h-5 w-5" />
                  </div>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {persona.eyebrow}
                  </p>
                  <CardTitle>{persona.title}</CardTitle>
                  <CardDescription>{persona.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <div className="mb-10 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">How it works</p>
            <h2 className="mt-1 text-2xl font-bold sm:text-3xl">Live in a couple of minutes</h2>
            <p className="mt-2 text-muted-foreground">No setup project, no consultant -- create an organization and start logging.</p>
          </div>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.number}>
                <span className="text-3xl font-bold text-primary">{step.number}</span>
                <h3 className="mt-2 font-semibold">{step.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="scroll-mt-16 border-t border-border bg-muted/30">
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

      <section id="pricing" className="scroll-mt-16 border-t border-border">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold sm:text-3xl">Simple pricing</h2>
            <p className="mt-2 text-muted-foreground">Start free with one site. Upgrade when you need more.</p>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {PLANS.map((plan) =>
              plan.highlighted ? (
                <Card key={plan.name} className="border-transparent bg-foreground text-background shadow-md">
                  <CardHeader>
                    <span className="inline-flex w-fit items-center rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground">
                      Most popular
                    </span>
                    <CardTitle className="mt-2 text-background">{plan.name}</CardTitle>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold">{plan.price}</span>
                      <span className="text-sm text-background/70">{plan.period}</span>
                    </div>
                    <CardDescription className="text-background/70">{plan.description}</CardDescription>
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
                    <Button asChild>
                      <Link href="/register">{plan.cta}</Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card key={plan.name}>
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
                    <Button asChild variant="outline">
                      <Link href="/register">{plan.cta}</Link>
                    </Button>
                  </CardContent>
                </Card>
              )
            )}
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-muted/30">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold sm:text-3xl">Questions, answered straight</h2>
          </div>
          <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
            {FAQS.map((faq) => (
              <div key={faq.question} className="p-5">
                <h3 className="font-semibold">{faq.question}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-6 py-16 text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">Stop tracking your sites on paper and WhatsApp</h2>
          <Button asChild size="lg">
            <Link href="/register">Get Started Free</Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-6 py-8 text-center text-sm text-muted-foreground sm:flex-row sm:justify-between">
          <span>© {new Date().getFullYear()} SiteTrack</span>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <span className="flex items-center gap-1.5">
              <Globe className="h-4 w-4" /> English & Hindi
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4" /> Data isolated per organization
            </span>
          </div>
        </div>
      </footer>
    </main>
  );
}

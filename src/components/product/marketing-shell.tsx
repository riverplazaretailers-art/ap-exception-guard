import { Link } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { DemoModeBanner } from "./states";

const NAV = [
  { to: "/workflow", label: "Workflow" },
  { to: "/integrations", label: "Integrations" },
  { to: "/pricing", label: "Pricing" },
  { to: "/security", label: "Security" },
  { to: "/faq", label: "FAQ" },
] as const;

export function ProductMark() {
  return (
    <Link to="/" className="flex items-baseline gap-2">
      <span className="text-sm font-semibold tracking-tight">AP Exception Desk</span>
      <span className="hidden text-[0.6875rem] text-muted-foreground sm:inline">
        TwoRiverOps
      </span>
    </Link>
  );
}

export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <DemoModeBanner />
      <header className="sticky top-0 z-40 border-b border-border bg-surface-raised/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <ProductMark />
          <nav aria-label="Product" className="hidden items-center gap-6 md:flex">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                activeProps={{ className: "text-foreground font-medium" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link to="/sign-in">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/start">Request a Pilot Analysis</Link>
            </Button>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="md:hidden" aria-label="Open menu">
                  <Menu className="size-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <SheetTitle className="text-sm">AP Exception Desk</SheetTitle>
                <nav aria-label="Product" className="mt-6 flex flex-col gap-1">
                  {[...NAV, { to: "/sign-in", label: "Sign in" } as const].map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      className="rounded-sm px-2 py-2 text-sm hover:bg-secondary"
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
      <main>{children}</main>
      <footer className="mt-20 border-t border-border bg-surface-sunken">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium text-foreground">AP Exception Desk</p>
            <p className="mt-1">A TwoRiverOps solution. Software for expensive operational problems.</p>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap gap-4">
            <Link to="/security" className="hover:text-foreground">
              Security &amp; trust
            </Link>
            <Link to="/pricing" className="hover:text-foreground">
              Pricing
            </Link>
            <Link to="/start" className="hover:text-foreground">
              Request access
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  lede,
}: {
  eyebrow: string;
  title: string;
  lede: string;
}) {
  return (
    <div className="border-b border-border bg-surface-raised">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-2 max-w-3xl text-3xl font-semibold sm:text-4xl">{title}</h1>
        <p className="mt-3 max-w-2xl text-base text-muted-foreground">{lede}</p>
      </div>
    </div>
  );
}
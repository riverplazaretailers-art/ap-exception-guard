import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketingShell } from "@/components/product/marketing-shell";
import { IntegrationStatusBadge } from "@/components/product/status-badge";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "@/lib/product/workflow";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AP Exception Desk — Catch payables exceptions before they cost you" },
      {
        name: "description",
        content:
          "AP Exception Desk reconciles AP, PO, receipt and statement records and surfaces duplicate payments, unsupported spend and aged approvals before month-end.",
      },
      { property: "og:title", content: "AP Exception Desk — A TwoRiverOps solution" },
      {
        property: "og:description",
        content:
          "Find duplicate payments, missing POs, receipt mismatches and aged approvals before they become fire drills.",
      },
    ],
  }),
  component: Landing,
});

const CONSEQUENCES = [
  {
    title: "Duplicate payments leave quietly",
    body: "A re-keyed invoice number or a vendor portal resubmission pays the same bill twice. Recovery means a credit request, a vendor call and a write-off if it ages past the window.",
  },
  {
    title: "Unsupported spend fails review",
    body: "Invoices without a purchase order or a matching receipt pass through approval because nobody had time to check the underlying records.",
  },
  {
    title: "Month-end becomes a fire drill",
    body: "Statement mismatches and aged approvals surface during close, when there is no time left to investigate them properly.",
  },
];

function Landing() {
  return (
    <MarketingShell>
      <section className="border-b border-border bg-surface-raised">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 lg:grid-cols-[1.15fr_0.85fr] lg:py-20">
          <div>
            <p className="eyebrow">A TwoRiverOps solution</p>
            <h1 className="mt-3 max-w-2xl text-3xl font-semibold leading-[1.15] sm:text-4xl lg:text-[2.75rem]">
              Catch payables exceptions before they become duplicate payments, unsupported spend
              or month-end fire drills.
            </h1>
            <p className="mt-4 max-w-xl text-base text-muted-foreground">
              AP Exception Desk reconciles your AP ledger against purchase orders, goods receipts
              and vendor statements, then hands your controller a reviewable list of exceptions with
              the source evidence attached.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/start">
                  Request a Pilot Analysis <ArrowRight className="ml-1 size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/workflow">See the workflow</Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Built for controllers, AP managers and outsourced finance teams. Read-only against
              your accounting system.
            </p>
          </div>

          <div className="panel p-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <p className="eyebrow">Exception categories</p>
              <span className="text-[0.6875rem] text-muted-foreground">Reviewed by your team</span>
            </div>
            <ul className="divide-y divide-border">
              {CATEGORY_ORDER.map((category) => (
                <li key={category} className="flex items-center gap-3 py-3 text-sm">
                  <Check className="size-4 text-primary" aria-hidden />
                  {CATEGORY_LABELS[category]}
                </li>
              ))}
            </ul>
            <div className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
              Every finding links to the invoice, purchase order, receipt, statement or payment
              record that triggered it.
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <p className="eyebrow">What it costs to find out late</p>
        <div className="mt-5 grid gap-px border border-border bg-border sm:grid-cols-3">
          {CONSEQUENCES.map((item) => (
            <div key={item.title} className="bg-surface-raised p-5">
              <h2 className="text-sm font-semibold">{item.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-surface-sunken">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 lg:grid-cols-2">
          <div>
            <p className="eyebrow">The desk</p>
            <h2 className="mt-2 text-2xl font-semibold">
              One reviewable queue, not another dashboard
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Create an analysis, connect QuickBooks Online or upload your AP, PO, receipt and
              statement files, and let the reconciliation engine do the matching. Your team reviews
              findings by category, inspects the source evidence, then assigns, resolves or
              dismisses each one. Every action is retained in audit history.
            </p>
            <Button asChild variant="outline" className="mt-5">
              <Link to="/workflow">Walk through the workflow</Link>
            </Button>
          </div>
          <div className="panel divide-y divide-border">
            {[
              ["Analysis", "Scoped to a close period or a full quarter of AP history."],
              ["Reconciliation", "Matching rules run server-side against your records."],
              ["Findings", "Grouped by category and severity, with dollars at risk shown."],
              ["Evidence", "Source documents linked to the rule that fired."],
              ["Audit history", "Assignment, resolution and dismissal retained per finding."],
            ].map(([title, body]) => (
              <div key={title} className="flex gap-4 p-4">
                <span className="w-28 shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {title}
                </span>
                <span className="text-sm">{body}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Data sources</p>
            <h2 className="mt-2 text-2xl font-semibold">Two ways in. Both honest about status.</h2>
          </div>
          <Link to="/integrations" className="text-sm font-medium text-primary hover:underline">
            Integration detail
          </Link>
        </div>
        <div className="mt-5 grid gap-px border border-border bg-border sm:grid-cols-2">
          <div className="bg-surface-raised p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">QuickBooks Online</h3>
              <IntegrationStatusBadge status="live" />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Read-only sync of bills, payments, vendors and purchase orders through the existing
              backend connection path.
            </p>
          </div>
          <div className="bg-surface-raised p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">CSV / spreadsheet upload</h3>
              <IntegrationStatusBadge status="live" />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              AP ledger, purchase order, goods receipt and vendor statement exports, processed
              server-side.
            </p>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          No other integrations are offered. We label a connection Live only when it is working and
          tested.
        </p>
      </section>

      <section className="border-t border-border bg-surface-raised">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-12 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Start with one period of AP history.</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              A Pilot Analysis is fixed-scope, priced in writing before work starts.
            </p>
          </div>
          <Button asChild size="lg">
            <Link to="/start">Request a Pilot Analysis</Link>
          </Button>
        </div>
      </section>
    </MarketingShell>
  );
}
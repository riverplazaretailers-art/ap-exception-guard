import { createFileRoute } from "@tanstack/react-router";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { MarketingShell, PageHeader } from "@/components/product/marketing-shell";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — AP Exception Desk" },
      {
        name: "description",
        content:
          "Common questions about AP Exception Desk: data access, QuickBooks sync, who reviews findings, evidence retention and pilot scope.",
      },
      { property: "og:title", content: "AP Exception Desk questions answered" },
      {
        property: "og:description",
        content: "Data access, QuickBooks sync, evidence retention, review responsibility and pilot scope.",
      },
    ],
  }),
  component: FaqPage,
});

const FAQS = [
  {
    q: "Does AP Exception Desk pay, void or change anything in our accounting system?",
    a: "No. The QuickBooks Online connection is read-only and uploads are copies of exports. Every correction stays in your accounting system, made by your team.",
  },
  {
    q: "Who decides whether a finding is a real exception?",
    a: "Your controller or AP manager does. The engine identifies candidates and shows the evidence and the rule that fired; the accounting judgement is yours, and it is recorded in audit history.",
  },
  {
    q: "What data do you need for a first analysis?",
    a: "An AP ledger export for the period, plus purchase orders, goods receipts and vendor statements where you have them. More record types mean more categories can be checked.",
  },
  {
    q: "How long does an analysis take?",
    a: "Reconciliation of a single close period typically completes in minutes once records are ingested. Larger multi-quarter histories take longer and run as background jobs.",
  },
  {
    q: "Can outsourced finance teams use one login across clients?",
    a: "Yes. Each client is a separate account with separated data and per-account access, under a finance partner arrangement.",
  },
  {
    q: "What does a Pilot Analysis include?",
    a: "One reconciliation period across all five exception categories, evidence-linked findings, and a written exception summary for your controller. Scope and price are agreed in writing first.",
  },
  {
    q: "Do you keep our documents?",
    a: "Source records are retained for the account so findings stay auditable. Retention windows and deletion are agreed per account before onboarding.",
  },
];

function FaqPage() {
  return (
    <MarketingShell>
      <PageHeader
        eyebrow="FAQ"
        title="Questions controllers ask first."
        lede="If something here is unclear, ask during the pilot conversation and we will answer plainly."
      />
      <section className="mx-auto max-w-3xl px-4 py-12">
        <Accordion type="single" collapsible className="border border-border bg-surface-raised">
          {FAQS.map((item, index) => (
            <AccordionItem key={item.q} value={`item-${index}`} className="px-4">
              <AccordionTrigger className="text-left text-sm font-semibold">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </MarketingShell>
  );
}
import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/product/app-shell";
import { isDemoMode } from "@/lib/product";

export const Route = createFileRoute("/app/help")({
  component: HelpPage,
});

const TOPICS = [
  {
    title: "What each exception category means",
    body: "Duplicate payment risk, missing purchase order, receipt mismatch, missing statement invoice and aged approval. Every finding carries the rule explanation written by the reconciliation engine, plus the records it compared.",
  },
  {
    title: "Getting records in",
    body: "Connect QuickBooks Online read-only, or upload your AP register, PO list, receipts and vendor statements as CSV or Excel exports. Both paths are live today.",
  },
  {
    title: "Working the queue",
    body: "Filter by category and state. Assign a finding to the person who owns the vendor relationship, resolve with a note once it is corrected, or dismiss with the reason it is acceptable. Notes are retained in audit history.",
  },
  {
    title: "What the product will not do",
    body: "It does not post entries, void payments or contact vendors. It surfaces exceptions with evidence so your team decides. Accounting decisions stay with you.",
  },
  {
    title: "Retention and export",
    body: "Findings, notes and audit entries remain available for export for the term agreed in your contract, including after cancellation.",
  },
];

function HelpPage() {
  return (
    <AppShell
      title="Help"
      description="How the desk works, what the categories mean, and where to reach us."
    >
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <dl className="divide-y divide-border border border-border bg-surface-raised">
          {TOPICS.map((topic) => (
            <div key={topic.title} className="p-5">
              <dt className="text-sm font-semibold">{topic.title}</dt>
              <dd className="mt-1.5 text-sm text-muted-foreground">{topic.body}</dd>
            </div>
          ))}
        </dl>

        <aside className="h-fit border border-border bg-surface-raised p-5 text-sm">
          <p className="eyebrow">Support</p>
          <p className="mt-2 text-muted-foreground">
            Reach your implementation contact for scoping, thresholds or connection changes. Include
            the analysis name — never attach source documents to a support message.
          </p>
          <p className="mt-4">
            <Link to="/security" className="font-medium text-primary hover:underline">
              Security and data handling
            </Link>
          </p>
          <p className="mt-1">
            <Link to="/faq" className="font-medium text-primary hover:underline">
              Public FAQ
            </Link>
          </p>
          {isDemoMode ? (
            <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
              This environment runs the labeled demo adapter. Records are synthetic and no accounting
              system is connected.
            </p>
          ) : null}
        </aside>
      </div>
    </AppShell>
  );
}
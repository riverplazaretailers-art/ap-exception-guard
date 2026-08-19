import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { MarketingShell, PageHeader } from "@/components/product/marketing-shell";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "@/lib/product/workflow";

export const Route = createFileRoute("/workflow")({
  head: () => ({
    meta: [
      { title: "Workflow — AP Exception Desk" },
      {
        name: "description",
        content:
          "How an AP Exception Desk analysis runs: connect or upload records, reconcile, review findings by category, inspect evidence, resolve with audit history.",
      },
      { property: "og:title", content: "How the AP Exception Desk workflow runs" },
      {
        property: "og:description",
        content:
          "Create an analysis, reconcile AP against PO, receipt and statement records, review findings with source evidence.",
      },
    ],
  }),
  component: WorkflowPage,
});

const STEPS = [
  {
    n: "01",
    title: "Create an analysis",
    body: "Name the review and set the period — a single close month or a full quarter of AP history.",
  },
  {
    n: "02",
    title: "Connect or upload your records",
    body: "Sync QuickBooks Online read-only, or upload AP ledger, purchase order, goods receipt and vendor statement exports. Files are processed server-side.",
  },
  {
    n: "03",
    title: "Reconcile",
    body: "The reconciliation engine matches invoices, orders, receipts, statements and payments. Matching rules are owned by the backend, not by this interface.",
  },
  {
    n: "04",
    title: "Review findings by category",
    body: "Work the queue by exception type and severity. Each finding states the rule that fired and the dollars exposed.",
  },
  {
    n: "05",
    title: "Inspect source evidence",
    body: "Open the underlying invoice, order, receipt, statement or payment record behind every finding before you decide.",
  },
  {
    n: "06",
    title: "Assign, resolve or dismiss",
    body: "Route findings to an owner and close them out. Every action is retained in audit history for the account.",
  },
];

function WorkflowPage() {
  return (
    <MarketingShell>
      <PageHeader
        eyebrow="Workflow"
        title="Six steps from raw AP records to a decision your controller can sign off."
        lede="The interface is a review desk. Accounting decisions stay with your team; matching stays with the engine."
      />
      <section className="mx-auto max-w-6xl px-4 py-12">
        <ol className="border border-border">
          {STEPS.map((step, index) => (
            <li
              key={step.n}
              className={`flex flex-col gap-1 bg-surface-raised p-5 sm:flex-row sm:gap-6 ${
                index > 0 ? "border-t border-border" : ""
              }`}
            >
              <span className="num w-10 shrink-0 text-sm text-primary">{step.n}</span>
              <div>
                <h2 className="text-sm font-semibold">{step.title}</h2>
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <h2 className="mt-12 text-xl font-semibold">What gets flagged</h2>
        <div className="mt-4 overflow-x-auto border border-border">
          <table className="w-full min-w-[38rem] text-sm">
            <caption className="sr-only">Exception categories and what each one means</caption>
            <thead className="bg-surface-sunken text-left">
              <tr>
                <th scope="col" className="px-4 py-2 font-semibold">
                  Category
                </th>
                <th scope="col" className="px-4 py-2 font-semibold">
                  What it means
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface-raised">
              {CATEGORY_ORDER.map((category) => (
                <tr key={category}>
                  <th scope="row" className="px-4 py-3 text-left font-medium">
                    {CATEGORY_LABELS[category]}
                  </th>
                  <td className="px-4 py-3 text-muted-foreground">
                    {DESCRIPTIONS[category]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/start">Request a Pilot Analysis</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/sign-in">Sign in to the desk</Link>
          </Button>
        </div>
      </section>
    </MarketingShell>
  );
}

const DESCRIPTIONS: Record<string, string> = {
  duplicate: "The same payable appears more than once across invoices or payment runs.",
  missing_po: "An invoice has no purchase order supporting it above your threshold.",
  receipt_mismatch: "Invoiced quantity or amount does not agree with the goods receipt.",
  missing_statement_invoice:
    "A vendor statement references an invoice that is absent from your ledger.",
  aged_approval: "An invoice has sat in approval past your escalation window.",
};
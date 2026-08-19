import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { MarketingShell, PageHeader } from "@/components/product/marketing-shell";

export const Route = createFileRoute("/security")({
  head: () => ({
    meta: [
      { title: "Security & trust — AP Exception Desk" },
      {
        name: "description",
        content:
          "How AP Exception Desk handles AP records: read-only accounting access, scoped account separation, retained audit history and agreed retention windows.",
      },
      { property: "og:title", content: "AP Exception Desk security and trust" },
      {
        property: "og:description",
        content: "Read-only accounting access, account separation, audit history and agreed retention.",
      },
    ],
  }),
  component: SecurityPage,
});

const SECTIONS = [
  {
    title: "Read-only by design",
    body: "The QuickBooks Online connection requests read access to bills, payments, vendors and purchase orders. AP Exception Desk never posts, voids or edits records in your accounting system.",
  },
  {
    title: "Account separation",
    body: "Every customer account holds its own records, findings and evidence. Finance partners get one account per client, with access granted per account rather than globally.",
  },
  {
    title: "Evidence handling",
    body: "Uploaded files and synced records are processed server-side and stored as evidence so findings remain auditable. Document contents are never sent to analytics or third-party trackers.",
  },
  {
    title: "Audit history",
    body: "Assignment, resolution and dismissal are recorded with actor, timestamp and note, and retained for the account so a reviewer can reconstruct any decision.",
  },
  {
    title: "Access control",
    body: "Roles limit who can run analyses, resolve findings and view operational job detail. Sign-in and permission checks are enforced by the backend, not by this interface.",
  },
  {
    title: "Retention and deletion",
    body: "Retention windows and deletion requests are agreed per account before onboarding, and honoured on request.",
  },
];

function SecurityPage() {
  return (
    <MarketingShell>
      <PageHeader
        eyebrow="Security & trust"
        title="You are handing us payables records. Here is exactly how they are treated."
        lede="No certification claims we have not earned. What follows is how the system behaves today."
      />
      <section className="mx-auto max-w-4xl px-4 py-12">
        <dl className="border border-border">
          {SECTIONS.map((section, index) => (
            <div
              key={section.title}
              className={`bg-surface-raised p-5 ${index > 0 ? "border-t border-border" : ""}`}
            >
              <dt className="text-sm font-semibold">{section.title}</dt>
              <dd className="mt-1 text-sm text-muted-foreground">{section.body}</dd>
            </div>
          ))}
        </dl>
        <div className="panel mt-8 p-5">
          <h2 className="text-sm font-semibold">Security questions before a pilot</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Send your security questionnaire with the access request and we will answer it directly,
            including anything we do not yet support.
          </p>
          <Button asChild className="mt-4">
            <Link to="/start">Request access</Link>
          </Button>
        </div>
      </section>
    </MarketingShell>
  );
}
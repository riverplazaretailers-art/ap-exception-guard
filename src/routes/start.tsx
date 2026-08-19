import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MarketingShell, PageHeader } from "@/components/product/marketing-shell";
import { ErrorState, SuccessNote } from "@/components/product/states";
import { analytics } from "@/lib/analytics";
import { can, isSecureLinkMode, productApi } from "@/lib/product";
import { SecureWorkspaceAction, UnavailableHere } from "@/components/product/handoff";

const searchSchema = z.object({ plan: z.string().optional() });

export const Route = createFileRoute("/start")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Request a Pilot Analysis — AP Exception Desk" },
      {
        name: "description",
        content:
          "Request a fixed-scope AP Exception Desk Pilot Analysis on one period of your payables history.",
      },
      { property: "og:title", content: "Request an AP Exception Desk Pilot Analysis" },
      {
        property: "og:description",
        content: "One period of AP history, all five exception categories, evidence-linked findings.",
      },
    ],
  }),
  component: StartPage,
});

function StartPage() {
  const { plan } = Route.useSearch();
  const [status, setStatus] = useState<"idle" | "pending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setStatus("pending");
    try {
      await productApi.requestAccess({
        name: String(form.get("name") ?? ""),
        email: String(form.get("email") ?? ""),
        company: String(form.get("company") ?? ""),
        context: String(form.get("context") ?? ""),
      });
      analytics.track("account_created", { source: "request_access", plan: plan ?? "pilot" });
      setStatus("sent");
    } catch (cause) {
      setError((cause as Error).message);
      setStatus("error");
    }
  }

  return (
    <MarketingShell>
      <PageHeader
        eyebrow="Request access"
        title="Request a Pilot Analysis"
        lede="Tell us who you are and what AP history you can share. We reply with scope, price in writing, and the records we need."
      />
      <section className="mx-auto grid max-w-5xl gap-8 px-4 py-12 lg:grid-cols-[1.1fr_0.9fr]">
        {!can("access_request") ? (
          <UnavailableHere
            title="Requests are handled in the secure workspace"
            action={
              <SecureWorkspaceAction path="/request-access" label="Request a Pilot Analysis" />
            }
          >
            {isSecureLinkMode
              ? "This shell does not accept real contact details. Continue to the preserved AP Exception Desk workspace to submit your request securely."
              : "No request destination is configured for this environment yet."}
          </UnavailableHere>
        ) : status === "sent" ? (
          <div className="panel p-6">
            <SuccessNote>Request received.</SuccessNote>
            <p className="mt-3 text-sm text-muted-foreground">
              We will follow up with scope, pricing in writing, and the export list for your first
              analysis. Nothing is billed until that scope is agreed.
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="panel space-y-4 p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" required autoComplete="name" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Work email</Label>
                <Input id="email" name="email" type="email" required autoComplete="email" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="company">Company</Label>
              <Input id="company" name="company" required autoComplete="organization" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="context">
                AP volume, systems in use, and what you suspect is slipping through
              </Label>
              <Textarea id="context" name="context" rows={5} />
            </div>
            {status === "error" && error ? (
              <ErrorState title="Request could not be sent" message={error} />
            ) : null}
            <Button type="submit" disabled={status === "pending"}>
              {status === "pending" ? "Sending…" : "Request a Pilot Analysis"}
            </Button>
            <p className="text-xs text-muted-foreground">
              We never ask for accounting credentials by email. Connection happens inside the product.
            </p>
          </form>
        )}

        <aside className="panel h-fit p-6">
          <p className="eyebrow">What happens next</p>
          <ol className="mt-3 space-y-3 text-sm text-muted-foreground">
            <li>
              <span className="font-medium text-foreground">1. Scoping call.</span> Period, entities,
              record types and thresholds.
            </li>
            <li>
              <span className="font-medium text-foreground">2. Written scope and price.</span> Fixed
              before any work begins.
            </li>
            <li>
              <span className="font-medium text-foreground">3. Records in.</span> QuickBooks Online
              read-only sync, or exports you upload.
            </li>
            <li>
              <span className="font-medium text-foreground">4. Exception review.</span> Your team works
              the queue with the evidence attached.
            </li>
          </ol>
          {plan ? (
            <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
              Interested plan: <span className="num">{plan}</span>
            </p>
          ) : null}
        </aside>
      </section>
    </MarketingShell>
  );
}
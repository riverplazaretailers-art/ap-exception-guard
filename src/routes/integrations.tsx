import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { MarketingShell, PageHeader } from "@/components/product/marketing-shell";
import { IntegrationStatusBadge } from "@/components/product/status-badge";
import { ErrorState, LoadingState } from "@/components/product/states";
import { productApi } from "@/lib/product";

export const Route = createFileRoute("/integrations")({
  head: () => ({
    meta: [
      { title: "Integrations — AP Exception Desk" },
      {
        name: "description",
        content:
          "QuickBooks Online sync and CSV upload are Live for AP Exception Desk. Every integration is labelled Live, Pilot or Planned honestly.",
      },
      { property: "og:title", content: "AP Exception Desk integrations" },
      {
        property: "og:description",
        content: "QuickBooks Online and CSV upload, labelled honestly. Nothing else claimed.",
      },
    ],
  }),
  component: IntegrationsPage,
});

function IntegrationsPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["integrations"],
    queryFn: () => productApi.listIntegrations(),
  });

  return (
    <MarketingShell>
      <PageHeader
        eyebrow="Integrations"
        title="Two supported data paths, labelled honestly."
        lede="Live means working and tested against the production backend. We do not list connectors we have not built."
      />
      <section className="mx-auto max-w-6xl px-4 py-12">
        {isLoading ? <LoadingState label="Loading integrations" /> : null}
        {error ? (
          <ErrorState message={(error as Error).message} onRetry={() => void refetch()} />
        ) : null}
        {data ? (
          <ul className="grid gap-px border border-border bg-border sm:grid-cols-2">
            {data.map((integration) => (
              <li key={integration.id} className="bg-surface-raised p-5">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-sm font-semibold">{integration.name}</h2>
                  <IntegrationStatusBadge status={integration.status} />
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{integration.summary}</p>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <div className="panel p-5">
            <h2 className="text-sm font-semibold">What Live means here</h2>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              <li>QuickBooks Online: read-only sync through the existing backend connection path.</li>
              <li>CSV upload: AP ledger, purchase order, goods receipt and vendor statement files.</li>
            </ul>
          </div>
          <div className="panel p-5">
            <h2 className="text-sm font-semibold">What we will not claim</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              No ERP, bank, procurement or OCR integration is offered today. If you need one, tell us
              during the pilot conversation and we will say plainly whether it exists, is in pilot,
              or is only planned.
            </p>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
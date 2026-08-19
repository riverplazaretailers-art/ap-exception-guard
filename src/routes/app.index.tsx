import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { AppShell, MetricTile } from "@/components/product/app-shell";
import { AnalysisStatusBadge } from "@/components/product/status-badge";
import { EmptyState, ErrorState, LoadingState } from "@/components/product/states";
import { count, day, usd } from "@/lib/format";
import { productApi } from "@/lib/product";

export const Route = createFileRoute("/app/")({
  component: Dashboard,
});

function Dashboard() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["analyses"],
    queryFn: () => productApi.listAnalyses(),
  });

  const openFindings = data?.reduce((sum, a) => sum + a.findingsOpen, 0) ?? 0;
  const atRisk = data?.reduce((sum, a) => sum + a.amountAtRiskCents, 0) ?? 0;
  const docs = data?.reduce((sum, a) => sum + a.documentsProcessed, 0) ?? 0;

  return (
    <AppShell
      title="Exception desk"
      description="Open exceptions across your analyses, with the newest reconciliation first."
      actions={
        <Button asChild>
          <Link to="/app/new">New analysis</Link>
        </Button>
      }
    >
      {isLoading ? <LoadingState label="Loading your analyses" /> : null}
      {error ? (
        <ErrorState
          title="Could not load analyses"
          message={(error as Error).message}
          onRetry={() => void refetch()}
        />
      ) : null}

      {data ? (
        data.length === 0 ? (
          <EmptyState
            title="No analyses yet"
            description="Create your first analysis, connect QuickBooks Online or upload your AP exports, and reconcile."
            action={
              <Button asChild>
                <Link to="/app/new">Create an analysis</Link>
              </Button>
            }
          />
        ) : (
          <>
            <div className="grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
              <MetricTile label="Open exceptions" value={count(openFindings)} note="Awaiting review" />
              <MetricTile
                label="Exposure under review"
                value={usd(atRisk)}
                note="Sum of flagged amounts, not a recovery claim"
              />
              <MetricTile label="Records processed" value={count(docs)} note="Across all analyses" />
              <MetricTile label="Analyses" value={count(data.length)} />
            </div>

            <div className="mt-6 overflow-x-auto border border-border">
              <table className="w-full min-w-[46rem] text-sm">
                <caption className="sr-only">Your analyses</caption>
                <thead className="bg-surface-sunken text-left">
                  <tr>
                    <th scope="col" className="px-4 py-2 font-semibold">Analysis</th>
                    <th scope="col" className="px-4 py-2 font-semibold">Period</th>
                    <th scope="col" className="px-4 py-2 font-semibold">Status</th>
                    <th scope="col" className="px-4 py-2 text-right font-semibold">Open</th>
                    <th scope="col" className="px-4 py-2 text-right font-semibold">Exposure</th>
                    <th scope="col" className="px-4 py-2 font-semibold">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-surface-raised">
                  {data.map((analysis) => (
                    <tr key={analysis.id} className="hover:bg-secondary/60">
                      <th scope="row" className="px-4 py-3 text-left font-medium">
                        <Link
                          to="/app/analyses/$analysisId"
                          params={{ analysisId: analysis.id }}
                          className="text-primary hover:underline"
                        >
                          {analysis.name}
                        </Link>
                      </th>
                      <td className="num px-4 py-3">{analysis.period}</td>
                      <td className="px-4 py-3">
                        <AnalysisStatusBadge status={analysis.status} />
                      </td>
                      <td className="num px-4 py-3 text-right">{count(analysis.findingsOpen)}</td>
                      <td className="num px-4 py-3 text-right">{usd(analysis.amountAtRiskCents)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{day(analysis.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )
      ) : null}
    </AppShell>
  );
}
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/product/app-shell";
import { AnalysisStatusBadge } from "@/components/product/status-badge";
import { EmptyState, ErrorState, LoadingState } from "@/components/product/states";
import { count, dateTime, usd } from "@/lib/format";
import { productApi } from "@/lib/product";

export const Route = createFileRoute("/app/history")({
  component: HistoryPage,
});

function HistoryPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["analyses"],
    queryFn: () => productApi.listAnalyses(),
  });

  return (
    <AppShell
      title="History"
      description="Every analysis your account has run, with the record counts and outcome retained for audit."
    >
      {isLoading ? <LoadingState label="Loading history" /> : null}
      {error ? (
        <ErrorState
          title="Could not load history"
          message={(error as Error).message}
          onRetry={() => void refetch()}
        />
      ) : null}
      {data ? (
        data.length === 0 ? (
          <EmptyState
            title="No history yet"
            description="Once you run your first reconciliation it will be retained here."
            action={
              <Button asChild>
                <Link to="/app/new">Create an analysis</Link>
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto border border-border">
            <table className="w-full min-w-[50rem] text-sm">
              <caption className="sr-only">Analysis history</caption>
              <thead className="bg-surface-sunken text-left">
                <tr>
                  <th scope="col" className="px-4 py-2 font-semibold">Analysis</th>
                  <th scope="col" className="px-4 py-2 font-semibold">Period</th>
                  <th scope="col" className="px-4 py-2 font-semibold">Status</th>
                  <th scope="col" className="px-4 py-2 text-right font-semibold">Records</th>
                  <th scope="col" className="px-4 py-2 text-right font-semibold">Findings</th>
                  <th scope="col" className="px-4 py-2 text-right font-semibold">Exposure</th>
                  <th scope="col" className="px-4 py-2 font-semibold">Completed</th>
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
                    <td className="num px-4 py-3 text-right">
                      {count(analysis.documentsProcessed)}
                    </td>
                    <td className="num px-4 py-3 text-right">{count(analysis.findingsTotal)}</td>
                    <td className="num px-4 py-3 text-right">{usd(analysis.amountAtRiskCents)}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {analysis.completedAt ? dateTime(analysis.completedAt) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : null}
    </AppShell>
  );
}
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AppShell, MetricTile } from "@/components/product/app-shell";
import {
  AnalysisStatusBadge,
  FindingStateBadge,
  SeverityBadge,
} from "@/components/product/status-badge";
import { EmptyState, ErrorState, LoadingState, SuccessNote } from "@/components/product/states";
import { analytics } from "@/lib/analytics";
import { count, day, usd } from "@/lib/format";
import { productApi, type FindingCategory, type FindingState } from "@/lib/product";
import { CATEGORY_LABELS, CATEGORY_ORDER, FINDING_STATE_LABELS } from "@/lib/product/workflow";

export const Route = createFileRoute("/app/analyses/$analysisId")({
  component: AnalysisDetail,
});

const STATE_FILTERS: FindingState[] = ["open", "assigned", "resolved", "dismissed"];

function AnalysisDetail() {
  const { analysisId } = Route.useParams();
  const queryClient = useQueryClient();
  const [category, setCategory] = useState<FindingCategory | "all">("all");
  const [state, setState] = useState<FindingState | "all">("open");

  const analysisQuery = useQuery({
    queryKey: ["analysis", analysisId],
    queryFn: () => productApi.getAnalysis(analysisId),
  });

  const findingsQuery = useQuery({
    queryKey: ["findings", analysisId, category, state],
    queryFn: () =>
      productApi.listFindings({
        analysisId,
        category: category === "all" ? undefined : category,
        state: state === "all" ? undefined : state,
      }),
    enabled: analysisQuery.data?.status === "ready",
  });

  const reconcile = useMutation({
    mutationFn: () => productApi.reconcileAnalysis(analysisId),
    onSuccess: async (analysis) => {
      if (analysis.status === "failed") {
        analytics.track("workflow_failed", { workflowId: analysis.id, stage: "reconcile" });
      } else {
        analytics.track("core_workflow_completed", {
          workflowId: analysis.id,
          findingCount: analysis.findingsTotal,
        });
        analytics.track("first_successful_outcome", { workflowId: analysis.id });
      }
      queryClient.setQueryData(["analysis", analysisId], analysis);
      await queryClient.invalidateQueries({ queryKey: ["findings", analysisId] });
      await queryClient.invalidateQueries({ queryKey: ["analyses"] });
    },
  });

  const analysis = analysisQuery.data;

  return (
    <AppShell
      title={analysis ? analysis.name : "Analysis"}
      description={
        analysis
          ? `Period ${analysis.period} · ${count(analysis.documentsProcessed)} records processed`
          : undefined
      }
      actions={
        analysis && analysis.status !== "reconciling" ? (
          <Button onClick={() => reconcile.mutate()} disabled={reconcile.isPending}>
            {reconcile.isPending
              ? "Reconciling…"
              : analysis.status === "ready"
                ? "Re-run reconciliation"
                : "Run reconciliation"}
          </Button>
        ) : null
      }
    >
      {analysisQuery.isLoading ? <LoadingState label="Loading analysis" /> : null}
      {analysisQuery.error ? (
        <ErrorState
          title="Could not load this analysis"
          message={(analysisQuery.error as Error).message}
          onRetry={() => void analysisQuery.refetch()}
        />
      ) : null}

      {analysis ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <AnalysisStatusBadge status={analysis.status} />
            <span className="text-xs text-muted-foreground">
              Created {day(analysis.createdAt)}
              {analysis.completedAt ? ` · Reconciled ${day(analysis.completedAt)}` : ""}
            </span>
          </div>

          {analysis.status === "failed" ? (
            <ErrorState
              title="Reconciliation failed"
              message={
                analysis.failureReason ??
                "The backend could not complete this run. Re-run once the source data is corrected."
              }
              onRetry={() => reconcile.mutate()}
            />
          ) : null}

          {reconcile.isSuccess && analysis.status === "ready" ? (
            <SuccessNote>
              Reconciliation complete — {count(analysis.findingsTotal)} findings, evidence attached.
            </SuccessNote>
          ) : null}

          <div className="grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
            <MetricTile label="Open exceptions" value={count(analysis.findingsOpen)} />
            <MetricTile label="Total findings" value={count(analysis.findingsTotal)} />
            <MetricTile
              label="Exposure under review"
              value={usd(analysis.amountAtRiskCents)}
              note="Flagged amounts, not a recovery claim"
            />
            <MetricTile label="Records processed" value={count(analysis.documentsProcessed)} />
          </div>

          <section className="border border-border bg-surface-raised p-4">
            <p className="eyebrow">Data sources</p>
            <ul className="mt-2 space-y-1 text-sm">
              {analysis.sources.map((source) => (
                <li key={source.id} className="flex flex-wrap gap-x-2 text-muted-foreground">
                  <span className="font-medium text-foreground">{source.label}</span>
                  <span>{source.detail}</span>
                  <span className="num">· attached {day(source.connectedAt)}</span>
                </li>
              ))}
            </ul>
          </section>

          {analysis.status === "ready" ? (
            <section>
              <div className="flex flex-wrap gap-4 border-b border-border pb-3">
                <div>
                  <p className="eyebrow">Category</p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    <FilterChip active={category === "all"} onClick={() => setCategory("all")}>
                      All
                    </FilterChip>
                    {CATEGORY_ORDER.map((item) => (
                      <FilterChip
                        key={item}
                        active={category === item}
                        onClick={() => setCategory(item)}
                      >
                        {CATEGORY_LABELS[item]}
                      </FilterChip>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="eyebrow">State</p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    <FilterChip active={state === "all"} onClick={() => setState("all")}>
                      All
                    </FilterChip>
                    {STATE_FILTERS.map((item) => (
                      <FilterChip key={item} active={state === item} onClick={() => setState(item)}>
                        {FINDING_STATE_LABELS[item]}
                      </FilterChip>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4">
                {findingsQuery.isLoading ? <LoadingState label="Loading findings" /> : null}
                {findingsQuery.error ? (
                  <ErrorState
                    title="Could not load findings"
                    message={(findingsQuery.error as Error).message}
                    onRetry={() => void findingsQuery.refetch()}
                  />
                ) : null}
                {findingsQuery.data ? (
                  findingsQuery.data.length === 0 ? (
                    <EmptyState
                      title="Nothing in this view"
                      description="No findings match the current category and state filter."
                    />
                  ) : (
                    <div className="overflow-x-auto border border-border">
                      <table className="w-full min-w-[52rem] text-sm">
                        <caption className="sr-only">Findings for {analysis.name}</caption>
                        <thead className="bg-surface-sunken text-left">
                          <tr>
                            <th scope="col" className="px-4 py-2 font-semibold">Vendor</th>
                            <th scope="col" className="px-4 py-2 font-semibold">Reference</th>
                            <th scope="col" className="px-4 py-2 font-semibold">Category</th>
                            <th scope="col" className="px-4 py-2 font-semibold">Severity</th>
                            <th scope="col" className="px-4 py-2 text-right font-semibold">Amount</th>
                            <th scope="col" className="px-4 py-2 font-semibold">State</th>
                            <th scope="col" className="px-4 py-2 font-semibold">Detected</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border bg-surface-raised">
                          {findingsQuery.data.map((finding) => (
                            <tr key={finding.id} className="hover:bg-secondary/60">
                              <th scope="row" className="px-4 py-3 text-left font-medium">
                                <Link
                                  to="/app/findings/$findingId"
                                  params={{ findingId: finding.id }}
                                  className="text-primary hover:underline"
                                >
                                  {finding.vendor}
                                </Link>
                              </th>
                              <td className="num px-4 py-3">{finding.reference}</td>
                              <td className="px-4 py-3">{CATEGORY_LABELS[finding.category]}</td>
                              <td className="px-4 py-3">
                                <SeverityBadge severity={finding.severity} />
                              </td>
                              <td className="num px-4 py-3 text-right">
                                {usd(finding.amountCents, finding.currency)}
                              </td>
                              <td className="px-4 py-3">
                                <FindingStateBadge state={finding.state} />
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">
                                {day(finding.detectedAt)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                ) : null}
              </div>
            </section>
          ) : analysis.status !== "failed" ? (
            <EmptyState
              title="No findings yet"
              description="Findings appear once the backend finishes reconciling the attached records."
            />
          ) : null}
        </div>
      ) : null}
    </AppShell>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={
        active
          ? "rounded-sm bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground"
          : "rounded-sm border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
      }
    >
      {children}
    </button>
  );
}
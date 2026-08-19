import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, MetricTile } from "@/components/product/app-shell";
import { useSession } from "@/components/product/session";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PermissionDenied,
} from "@/components/product/states";
import { count, dateTime } from "@/lib/format";
import { productApi } from "@/lib/product";

export const Route = createFileRoute("/app/ops")({
  component: OpsPage,
});

const STATUS_LABELS: Record<string, string> = {
  queued: "Queued",
  running: "Running",
  succeeded: "Succeeded",
  failed: "Failed",
};

function OpsPage() {
  const { user } = useSession();
  const canOperate = user?.role === "operator" || user?.role === "controller";

  const jobs = useQuery({
    queryKey: ["ops-jobs"],
    queryFn: () => productApi.listOperationalJobs(),
    enabled: canOperate,
    refetchInterval: 30_000,
  });

  if (!canOperate) {
    return (
      <AppShell title="Jobs & failures">
        <PermissionDenied message="Ingestion and reconciliation jobs are visible to controllers and operators. Ask your account administrator if you need this view." />
      </AppShell>
    );
  }

  const failed = jobs.data?.filter((job) => job.status === "failed") ?? [];
  const running = jobs.data?.filter((job) => job.status === "running" || job.status === "queued") ?? [];

  return (
    <AppShell
      title="Jobs & failures"
      description="Ingestion and reconciliation runs reported by the backend, so a failed sync is visible before month-end rather than after."
    >
      {jobs.isLoading ? <LoadingState label="Loading jobs" /> : null}
      {jobs.error ? (
        <ErrorState
          title="Could not load jobs"
          message={(jobs.error as Error).message}
          onRetry={() => void jobs.refetch()}
        />
      ) : null}

      {jobs.data ? (
        jobs.data.length === 0 ? (
          <EmptyState
            title="No jobs recorded"
            description="Ingestion and reconciliation runs appear here as soon as an analysis is processed."
          />
        ) : (
          <div className="space-y-6">
            <div className="grid gap-px border border-border bg-border sm:grid-cols-3">
              <MetricTile label="In flight" value={count(running.length)} />
              <MetricTile label="Failed" value={count(failed.length)} note="Needs attention" />
              <MetricTile label="Total runs" value={count(jobs.data.length)} />
            </div>

            <div className="overflow-x-auto border border-border">
              <table className="w-full min-w-[44rem] text-sm">
                <caption className="sr-only">Backend jobs</caption>
                <thead className="bg-surface-sunken text-left">
                  <tr>
                    <th scope="col" className="px-4 py-2 font-semibold">Job</th>
                    <th scope="col" className="px-4 py-2 font-semibold">Analysis</th>
                    <th scope="col" className="px-4 py-2 font-semibold">Status</th>
                    <th scope="col" className="px-4 py-2 font-semibold">Started</th>
                    <th scope="col" className="px-4 py-2 text-right font-semibold">Duration</th>
                    <th scope="col" className="px-4 py-2 font-semibold">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-surface-raised">
                  {jobs.data.map((job) => (
                    <tr key={job.id} className="hover:bg-secondary/60">
                      <th scope="row" className="px-4 py-3 text-left font-medium">{job.kind}</th>
                      <td className="px-4 py-3">
                        <Link
                          to="/app/analyses/$analysisId"
                          params={{ analysisId: job.analysisId }}
                          className="num text-primary hover:underline"
                        >
                          {job.analysisId}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-xs font-semibold uppercase tracking-wide"
                          style={{
                            color:
                              job.status === "failed"
                                ? "var(--status-failed)"
                                : job.status === "succeeded"
                                  ? "var(--status-resolved)"
                                  : "var(--status-assigned)",
                          }}
                        >
                          {STATUS_LABELS[job.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{dateTime(job.startedAt)}</td>
                      <td className="num px-4 py-3 text-right">
                        {job.durationMs ? `${(job.durationMs / 1000).toFixed(1)}s` : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{job.error ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : null}
    </AppShell>
  );
}
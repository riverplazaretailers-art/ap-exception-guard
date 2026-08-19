import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AppShell } from "@/components/product/app-shell";
import { FindingStateBadge, SeverityBadge } from "@/components/product/status-badge";
import { ErrorState, LoadingState, SuccessNote } from "@/components/product/states";
import { dateTime, usdExact } from "@/lib/format";
import { can, isSecureLinkMode, productApi } from "@/lib/product";
import { SecureWorkspaceAction, UnavailableHere } from "@/components/product/handoff";
import { CATEGORY_LABELS, allowedFindingActions } from "@/lib/product/workflow";

export const Route = createFileRoute("/app/findings/$findingId")({
  component: FindingDetail,
});

const EVIDENCE_KIND_LABELS: Record<string, string> = {
  invoice: "Invoice",
  purchase_order: "Purchase order",
  receipt: "Receipt",
  statement: "Vendor statement",
  payment: "Payment record",
};

function FindingDetail() {
  const { findingId } = Route.useParams();
  const queryClient = useQueryClient();
  const [assignee, setAssignee] = useState("");
  const [note, setNote] = useState("");
  const [done, setDone] = useState<string | null>(null);

  const findingQuery = useQuery({
    queryKey: ["finding", findingId],
    queryFn: () => productApi.getFinding(findingId),
  });

  const act = useMutation({
    mutationFn: async (action: "assign" | "resolve" | "dismiss") => {
      if (action === "assign") return productApi.assignFinding(findingId, assignee);
      if (action === "resolve") return productApi.resolveFinding(findingId, note);
      return productApi.dismissFinding(findingId, note);
    },
    onSuccess: async (finding, action) => {
      queryClient.setQueryData(["finding", findingId], finding);
      await queryClient.invalidateQueries({ queryKey: ["findings", finding.analysisId] });
      await queryClient.invalidateQueries({ queryKey: ["analysis", finding.analysisId] });
      await queryClient.invalidateQueries({ queryKey: ["analyses"] });
      setDone(action);
      setNote("");
    },
  });

  const finding = findingQuery.data;
  const actions = finding ? allowedFindingActions(finding.state) : [];

  return (
    <AppShell
      title={finding ? finding.vendor : "Finding"}
      description={finding ? `${CATEGORY_LABELS[finding.category]} · ${finding.reference}` : undefined}
      actions={
        finding ? (
          <Button asChild variant="outline">
            <Link to="/app/analyses/$analysisId" params={{ analysisId: finding.analysisId }}>
              Back to queue
            </Link>
          </Button>
        ) : null
      }
    >
      {findingQuery.isLoading ? <LoadingState label="Loading finding" /> : null}
      {findingQuery.error ? (
        <ErrorState
          title="Could not load this finding"
          message={(findingQuery.error as Error).message}
          onRetry={() => void findingQuery.refetch()}
        />
      ) : null}

      {finding ? (
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-6">
            <div className="border border-border bg-surface-raised p-5">
              <div className="flex flex-wrap items-center gap-2">
                <FindingStateBadge state={finding.state} />
                <SeverityBadge severity={finding.severity} />
                <span className="num ml-auto text-lg font-semibold">
                  {usdExact(finding.amountCents, finding.currency)}
                </span>
              </div>
              <p className="eyebrow mt-5">Why this was flagged</p>
              <p className="mt-1.5 text-sm text-muted-foreground">{finding.rationale}</p>
              <p className="mt-3 text-xs text-muted-foreground">
                Detected {dateTime(finding.detectedAt)} by the reconciliation engine.
                {finding.assignee ? ` Assigned to ${finding.assignee}.` : ""}
              </p>
            </div>

            <section className="border border-border bg-surface-raised p-5">
              <p className="eyebrow">Source evidence</p>
              <ul className="mt-3 divide-y divide-border">
                {finding.evidence.map((item) => (
                  <li key={item.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                    <FileText className="size-4 text-muted-foreground" aria-hidden />
                    <span className="font-medium">{item.label}</span>
                    <span className="text-muted-foreground">
                      {EVIDENCE_KIND_LABELS[item.kind] ?? item.kind} · {item.sourceLabel}
                    </span>
                    <span className="num ml-auto text-xs text-muted-foreground">
                      {dateTime(item.capturedAt)}
                    </span>
                    {item.viewUrl ? (
                      <Button asChild variant="outline" size="sm">
                        <a href={item.viewUrl} target="_blank" rel="noreferrer">
                          Open
                        </a>
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">No viewable copy</span>
                    )}
                  </li>
                ))}
              </ul>
            </section>

            <section className="border border-border bg-surface-raised p-5">
              <p className="eyebrow">Audit history</p>
              <ol className="mt-3 space-y-3 text-sm">
                {finding.audit.map((entry) => (
                  <li key={entry.id} className="border-l-2 border-border pl-3">
                    <p className="font-medium">{entry.action}</p>
                    <p className="num text-xs text-muted-foreground">
                      {dateTime(entry.at)} · {entry.actor}
                    </p>
                    {entry.note ? (
                      <p className="mt-1 text-muted-foreground">{entry.note}</p>
                    ) : null}
                  </li>
                ))}
              </ol>
            </section>
          </div>

          <aside className="space-y-4 border border-border bg-surface-raised p-5 lg:h-fit">
            <p className="eyebrow">Disposition</p>
            {!can("finding_disposition") ? (
              <UnavailableHere
                title="Dispositions are recorded in the secure workspace"
                action={
                  <SecureWorkspaceAction
                    path="/findings"
                    label="Open secure workspace"
                    variant="outline"
                    size="sm"
                  />
                }
              >
                {isSecureLinkMode
                  ? "Assigning, resolving and dismissing findings writes to the preserved audit trail, so it happens in the secure AP Exception Desk workspace."
                  : "This environment cannot record dispositions."}
              </UnavailableHere>
            ) : (
            <>
            {done ? <SuccessNote>Finding {done === "assign" ? "assigned" : `${done}d`}.</SuccessNote> : null}
            {act.error ? (
              <ErrorState title="Action failed" message={(act.error as Error).message} />
            ) : null}

            {actions.includes("assign") ? (
              <div className="space-y-1.5">
                <Label htmlFor="assignee">Assign to</Label>
                <Input
                  id="assignee"
                  placeholder="Name or email"
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!assignee || act.isPending}
                  onClick={() => act.mutate("assign")}
                >
                  Assign
                </Button>
              </div>
            ) : null}

            {actions.includes("resolve") || actions.includes("dismiss") ? (
              <div className="space-y-1.5 border-t border-border pt-4">
                <Label htmlFor="note">Resolution note (kept in audit history)</Label>
                <Textarea
                  id="note"
                  rows={4}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={!note || act.isPending}
                    onClick={() => act.mutate("resolve")}
                  >
                    Resolve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!note || act.isPending}
                    onClick={() => act.mutate("dismiss")}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            ) : null}

            {actions.length === 1 && actions[0] === "reopen" ? (
              <p className="text-sm text-muted-foreground">
                This finding is closed. Reopening is handled by an account administrator so the audit
                trail stays intact.
              </p>
            ) : null}
            </>
            )}
          </aside>
        </div>
      ) : null}
    </AppShell>
  );
}
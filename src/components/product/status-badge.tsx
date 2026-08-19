import type { AnalysisStatus, FindingState, IntegrationStatus, Severity } from "@/lib/product";
import {
  ANALYSIS_STATUS_LABELS,
  FINDING_STATE_LABELS,
  SEVERITY_LABELS,
} from "@/lib/product/workflow";

const base =
  "inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide";

function tone(fg: string, bg: string) {
  return { color: `var(${fg})`, backgroundColor: `var(${bg})` };
}

export function FindingStateBadge({ state }: { state: FindingState }) {
  const styles: Record<FindingState, React.CSSProperties> = {
    open: tone("--status-open", "--status-open-surface"),
    assigned: tone("--status-assigned", "--status-assigned-surface"),
    resolved: tone("--status-resolved", "--status-resolved-surface"),
    dismissed: tone("--status-dismissed", "--status-dismissed-surface"),
  };
  return (
    <span className={base} style={styles[state]}>
      {FINDING_STATE_LABELS[state]}
    </span>
  );
}

export function AnalysisStatusBadge({ status }: { status: AnalysisStatus }) {
  const styles: Record<AnalysisStatus, React.CSSProperties> = {
    draft: tone("--status-dismissed", "--status-dismissed-surface"),
    ingesting: tone("--status-assigned", "--status-assigned-surface"),
    reconciling: tone("--status-assigned", "--status-assigned-surface"),
    ready: tone("--status-resolved", "--status-resolved-surface"),
    failed: tone("--status-failed", "--status-failed-surface"),
  };
  return (
    <span className={base} style={styles[status]}>
      {ANALYSIS_STATUS_LABELS[status]}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  const styles: Record<Severity, React.CSSProperties> = {
    high: tone("--status-failed", "--status-failed-surface"),
    medium: tone("--status-open", "--status-open-surface"),
    low: tone("--status-dismissed", "--status-dismissed-surface"),
  };
  return (
    <span className={base} style={styles[severity]}>
      {SEVERITY_LABELS[severity]}
    </span>
  );
}

const INTEGRATION_LABELS: Record<IntegrationStatus, string> = {
  live: "Live",
  pilot: "Pilot",
  planned: "Planned",
};

export function IntegrationStatusBadge({ status }: { status: IntegrationStatus }) {
  const styles: Record<IntegrationStatus, React.CSSProperties> = {
    live: tone("--status-resolved", "--status-resolved-surface"),
    pilot: tone("--status-open", "--status-open-surface"),
    planned: tone("--status-dismissed", "--status-dismissed-surface"),
  };
  return (
    <span className={base} style={styles[status]}>
      {INTEGRATION_LABELS[status]}
    </span>
  );
}
/**
 * Presentation-layer workflow vocabulary and UI state transitions.
 * These are display/interaction rules only — no accounting or matching logic.
 */
import type { AnalysisStatus, FindingCategory, FindingState, Severity } from "./types";

export const CATEGORY_LABELS: Record<FindingCategory, string> = {
  duplicate: "Duplicate payment risk",
  missing_po: "Missing purchase order",
  receipt_mismatch: "Receipt mismatch",
  missing_statement_invoice: "Missing statement invoice",
  aged_approval: "Aged approval",
};

export const CATEGORY_ORDER: FindingCategory[] = [
  "duplicate",
  "missing_po",
  "receipt_mismatch",
  "missing_statement_invoice",
  "aged_approval",
];

export const FINDING_STATE_LABELS: Record<FindingState, string> = {
  open: "Open",
  assigned: "Assigned",
  resolved: "Resolved",
  dismissed: "Dismissed",
};

export const SEVERITY_LABELS: Record<Severity, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const ANALYSIS_STATUS_LABELS: Record<AnalysisStatus, string> = {
  draft: "Draft",
  ingesting: "Ingesting data",
  reconciling: "Reconciling",
  ready: "Findings ready",
  failed: "Failed",
};

/** Which actions the UI may offer for a finding in a given state. */
export type FindingAction = "assign" | "resolve" | "dismiss" | "reopen";

const ALLOWED: Record<FindingState, FindingAction[]> = {
  open: ["assign", "resolve", "dismiss"],
  assigned: ["assign", "resolve", "dismiss"],
  resolved: ["reopen"],
  dismissed: ["reopen"],
};

export function allowedFindingActions(state: FindingState): FindingAction[] {
  return ALLOWED[state];
}

export function canPerform(state: FindingState, action: FindingAction): boolean {
  return ALLOWED[state].includes(action);
}

/** Analysis step model used by the workflow screen. */
export type WorkflowStep = "connect" | "reconcile" | "review";

export function stepForStatus(status: AnalysisStatus): WorkflowStep {
  if (status === "draft") return "connect";
  if (status === "ingesting" || status === "reconciling") return "reconcile";
  return "review";
}

export function isTerminal(status: AnalysisStatus): boolean {
  return status === "ready" || status === "failed";
}

export function nextAnalysisStatus(
  status: AnalysisStatus,
  event: "sources_attached" | "reconcile_started" | "reconcile_succeeded" | "reconcile_failed",
): AnalysisStatus {
  switch (event) {
    case "sources_attached":
      return status === "draft" ? "ingesting" : status;
    case "reconcile_started":
      return status === "ingesting" || status === "failed" ? "reconciling" : status;
    case "reconcile_succeeded":
      return status === "reconciling" || status === "ingesting" ? "ready" : status;
    case "reconcile_failed":
      return "failed";
  }
}
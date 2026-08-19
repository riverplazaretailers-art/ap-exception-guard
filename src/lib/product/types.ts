/**
 * ProductApi — the single typed boundary between this Lovable frontend and the
 * authoritative AP Exception Desk backend (reconciliation rules, QuickBooks
 * OAuth/sync, file processing, evidence store, workflow state, audit events).
 *
 * No accounting or matching decision may be reproduced in UI components.
 */

export type IntegrationStatus = "live" | "pilot" | "planned";

export type AnalysisStatus =
  | "draft"
  | "ingesting"
  | "reconciling"
  | "ready"
  | "failed";

export type FindingCategory =
  | "duplicate"
  | "missing_po"
  | "receipt_mismatch"
  | "missing_statement_invoice"
  | "aged_approval";

export type FindingState = "open" | "assigned" | "resolved" | "dismissed";

export type Severity = "high" | "medium" | "low";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: "controller" | "ap_manager" | "finance_partner" | "operator";
  accountId: string;
  accountName: string;
}

export interface DataSource {
  id: string;
  kind: "quickbooks" | "csv_upload";
  label: string;
  detail: string;
  connectedAt: string;
}

export interface Analysis {
  id: string;
  name: string;
  period: string;
  status: AnalysisStatus;
  createdAt: string;
  completedAt?: string;
  sources: DataSource[];
  documentsProcessed: number;
  findingsOpen: number;
  findingsTotal: number;
  amountAtRiskCents: number;
  failureReason?: string;
}

export interface EvidenceRef {
  id: string;
  label: string;
  kind: "invoice" | "purchase_order" | "receipt" | "statement" | "payment";
  sourceLabel: string;
  /** Backend-signed, short-lived URL. Never a raw document body. */
  viewUrl?: string;
  capturedAt: string;
}

export interface AuditEntry {
  id: string;
  at: string;
  actor: string;
  action: string;
  note?: string;
}

export interface Finding {
  id: string;
  analysisId: string;
  category: FindingCategory;
  severity: Severity;
  vendor: string;
  reference: string;
  amountCents: number;
  currency: string;
  detectedAt: string;
  state: FindingState;
  assignee?: string;
  /** Backend-authored explanation of the rule that fired. */
  rationale: string;
  evidence: EvidenceRef[];
  audit: AuditEntry[];
}

export interface Integration {
  id: string;
  name: string;
  status: IntegrationStatus;
  summary: string;
}

export interface PricingPlan {
  id: string;
  name: string;
  audience: string;
  priceLabel: string;
  billingNote: string;
  features: string[];
  ctaLabel: string;
  highlighted?: boolean;
}

export interface OperationalJob {
  id: string;
  analysisId: string;
  kind: string;
  status: "queued" | "running" | "succeeded" | "failed";
  startedAt: string;
  durationMs?: number;
  error?: string;
}

export interface CreateAnalysisInput {
  name: string;
  period: string;
  sourceKinds: Array<DataSource["kind"]>;
  uploadedFileNames?: string[];
}

export interface FindingQuery {
  analysisId: string;
  category?: FindingCategory | undefined;
  state?: FindingState | undefined;
}

export interface AccessRequestInput {
  name: string;
  email: string;
  company: string;
  context?: string | undefined;
}

export class ProductApiError extends Error {
  constructor(
    message: string,
    readonly code: "unauthorized" | "forbidden" | "not_found" | "server" | "network",
  ) {
    super(message);
    this.name = "ProductApiError";
  }
}

export interface ProductApi {
  readonly mode: "http" | "demo";

  signIn(email: string, password: string): Promise<SessionUser>;
  signOut(): Promise<void>;
  getSession(): Promise<SessionUser | null>;
  requestAccess(input: AccessRequestInput): Promise<void>;

  listAnalyses(): Promise<Analysis[]>;
  getAnalysis(id: string): Promise<Analysis>;
  createAnalysis(input: CreateAnalysisInput): Promise<Analysis>;
  /** Asks the backend to run reconciliation. Rules live server-side. */
  reconcileAnalysis(id: string): Promise<Analysis>;

  listFindings(query: FindingQuery): Promise<Finding[]>;
  getFinding(id: string): Promise<Finding>;
  assignFinding(id: string, assignee: string): Promise<Finding>;
  resolveFinding(id: string, note: string): Promise<Finding>;
  dismissFinding(id: string, note: string): Promise<Finding>;

  listIntegrations(): Promise<Integration[]>;
  listPricingPlans(): Promise<PricingPlan[]>;
  listOperationalJobs(): Promise<OperationalJob[]>;
}
/**
 * Backend v1 DTOs + pure mapping functions.
 *
 * These types describe EXACTLY what the preserved AP Exception Desk backend
 * returns (snake_case, dollar amounts, its own status vocabulary). Nothing here
 * makes an accounting decision: mappers only rename, convert units and translate
 * the backend's vocabulary into the UI domain types. Anything the backend does
 * not send stays absent — we never fabricate evidence, audit trails or workflow
 * state the backend cannot persist.
 */
import type {
  Analysis,
  AnalysisStatus,
  DataSource,
  Finding,
  FindingCategory,
  QuickBooksConnectionStatus,
  Severity,
} from "./types";

/* ----------------------------- DTOs / envelopes ---------------------------- */

export interface PilotRowDto {
  id: string;
  company: string;
  status: string;
  created_at: string;
  retention_until?: string | null;
  open_count?: number | null;
  file_count?: number | null;
}

export interface PilotFileDto {
  id: string;
  name: string;
  content_type?: string | null;
  size?: number | null;
  kind: string;
  status?: string | null;
  uploaded_at: string;
}

export interface PilotRecordCountDto {
  kind: string;
  count: number;
}

export interface ConnectionDto {
  provider: string;
  status: string;
  realm_id?: string | null;
  updated_at?: string | null;
}

export interface FindingDto {
  id: string;
  type: string;
  severity: string;
  vendor?: string | null;
  invoice?: string | null;
  amount?: number | null;
  summary?: string | null;
  question?: string | null;
  evidence?: unknown;
  status: string;
  assigned_to?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface PilotListEnvelope {
  pilots: PilotRowDto[];
}
export interface PilotCreatedEnvelope {
  pilot: PilotRowDto;
}
export interface PilotDetailEnvelope {
  pilot: PilotRowDto;
  files?: PilotFileDto[];
  records?: PilotRecordCountDto[];
  connections?: ConnectionDto[];
  findings?: FindingDto[];
}
export interface FileUploadedEnvelope {
  file: PilotFileDto;
  recordsCreated?: number;
  findingsCreated?: number;
}
export interface FindingPatchEnvelope {
  ok: boolean;
  status: string;
  assigned_to?: string | null;
}
export interface QuickBooksStatusEnvelope {
  configured: boolean;
  connection: ConnectionDto | null;
}
export interface QuickBooksSyncEnvelope {
  records: number;
  findings: number;
}

/** The only file kinds POST /api/pilots/:id/files accepts. */
export const UPLOAD_KINDS = [
  "invoice_export",
  "purchase_orders",
  "receipts",
  "vendor_statement",
  "supporting_pdf",
] as const;

export type UploadKind = (typeof UPLOAD_KINDS)[number];

export const UPLOAD_KIND_LABELS: Record<UploadKind, string> = {
  invoice_export: "AP / invoice export",
  purchase_orders: "Purchase orders",
  receipts: "Receipts",
  vendor_statement: "Vendor statement",
  supporting_pdf: "Supporting PDF",
};

export function isUploadKind(value: string): value is UploadKind {
  return (UPLOAD_KINDS as readonly string[]).includes(value);
}

/** The backend detail envelope carries no period field. Never invent one. */
export const UNKNOWN_PERIOD = "—";

/* -------------------------------- mapping --------------------------------- */

const ANALYSIS_STATUS: Record<string, AnalysisStatus> = {
  draft: "draft",
  new: "draft",
  created: "draft",
  uploading: "ingesting",
  ingesting: "ingesting",
  processing: "ingesting",
  reconciling: "reconciling",
  matching: "reconciling",
  ready: "ready",
  complete: "ready",
  completed: "ready",
  failed: "failed",
  error: "failed",
};

export function mapAnalysisStatus(raw: string): AnalysisStatus {
  return ANALYSIS_STATUS[raw.trim().toLowerCase()] ?? "draft";
}

/** Explicit backend finding-type vocabulary. Unknown types are NOT guessed. */
const FINDING_CATEGORY: Record<string, FindingCategory> = {
  "possible duplicate": "duplicate",
  "missing purchase order": "missing_po",
  "purchase order not found": "missing_po",
  "po amount mismatch": "missing_po",
  "receipt not found": "receipt_mismatch",
  "receipt mismatch": "receipt_mismatch",
  "statement invoice missing": "missing_statement_invoice",
  "aged approval": "aged_approval",
};

export function mapFindingCategory(raw: string): FindingCategory | null {
  return FINDING_CATEGORY[raw.trim().toLowerCase()] ?? null;
}

const SEVERITY: Record<string, Severity> = {
  high: "high",
  medium: "medium",
  low: "low",
};

export function mapSeverity(raw: string): Severity | null {
  return SEVERITY[raw.trim().toLowerCase()] ?? null;
}

/** The backend persists only these two finding states. */
export function mapFindingState(raw: string): "open" | "resolved" | null {
  const value = raw.trim().toLowerCase();
  if (value === "open") return "open";
  if (value === "resolved") return "resolved";
  return null;
}

export function dollarsToCents(amount: number | null | undefined): number {
  if (typeof amount !== "number" || !Number.isFinite(amount)) return 0;
  return Math.round(amount * 100);
}

/** Backend `evidence` is free-form. Render it as text; never as a document URL. */
export function mapEvidenceNote(evidence: unknown): string | undefined {
  if (evidence == null) return undefined;
  if (typeof evidence === "string") return evidence.trim() || undefined;
  if (Array.isArray(evidence)) {
    const lines = evidence.map((item) => (typeof item === "string" ? item : JSON.stringify(item)));
    return lines.join("\n") || undefined;
  }
  if (typeof evidence === "object") {
    return (
      Object.entries(evidence as Record<string, unknown>)
        .map(([key, value]) => `${key}: ${typeof value === "string" ? value : JSON.stringify(value)}`)
        .join("\n") || undefined
    );
  }
  return String(evidence);
}

export interface MappedFindings {
  findings: Finding[];
  /** Rows the backend sent that this contract version cannot represent. */
  unmapped: Array<{ id: string; reason: string }>;
}

export function mapFinding(dto: FindingDto, analysisId: string): Finding | { reason: string } {
  const category = mapFindingCategory(dto.type);
  if (!category) return { reason: `Unknown finding type "${dto.type}"` };
  const state = mapFindingState(dto.status);
  if (!state) return { reason: `Unknown finding status "${dto.status}"` };
  const severity = mapSeverity(dto.severity);
  if (!severity) return { reason: `Unknown severity "${dto.severity}"` };

  const assignee = dto.assigned_to?.trim() || undefined;
  const evidenceNote = mapEvidenceNote(dto.evidence);
  const question = dto.question?.trim() || undefined;

  return {
    id: dto.id,
    analysisId,
    category,
    severity,
    vendor: dto.vendor?.trim() || "Unnamed vendor",
    reference: dto.invoice?.trim() || "—",
    amountCents: dollarsToCents(dto.amount),
    currency: "USD",
    detectedAt: dto.created_at,
    state,
    ...(assignee ? { assignee } : {}),
    rationale: dto.summary?.trim() || "",
    ...(question ? { question } : {}),
    ...(evidenceNote ? { evidenceNote } : {}),
    // The v1 contract exposes no per-finding document refs or audit trail.
    evidence: [],
    audit: [],
  };
}

export function mapFindings(dtos: readonly FindingDto[], analysisId: string): MappedFindings {
  const findings: Finding[] = [];
  const unmapped: Array<{ id: string; reason: string }> = [];
  for (const dto of dtos) {
    const mapped = mapFinding(dto, analysisId);
    if ("reason" in mapped) unmapped.push({ id: dto.id, reason: mapped.reason });
    else findings.push(mapped);
  }
  return { findings, unmapped };
}

const CONNECTION_LABELS: Record<string, string> = {
  quickbooks: "QuickBooks Online",
  qbo: "QuickBooks Online",
};

function mapConnectionSource(dto: ConnectionDto): DataSource {
  return {
    id: `connection:${dto.provider}`,
    kind: "quickbooks",
    label: CONNECTION_LABELS[dto.provider.toLowerCase()] ?? dto.provider,
    detail: dto.realm_id ? `${dto.status} · realm ${dto.realm_id}` : dto.status,
    connectedAt: dto.updated_at ?? "",
  };
}

function mapFileSource(dto: PilotFileDto): DataSource {
  const kindLabel = isUploadKind(dto.kind) ? UPLOAD_KIND_LABELS[dto.kind] : dto.kind;
  return {
    id: `file:${dto.id}`,
    kind: "csv_upload",
    label: dto.name,
    detail: dto.status ? `${kindLabel} · ${dto.status}` : kindLabel,
    connectedAt: dto.uploaded_at,
  };
}

/** List rows only carry counters — no sources, no exposure figure. */
export function mapPilotRow(dto: PilotRowDto): Analysis {
  const open = dto.open_count ?? 0;
  return {
    id: dto.id,
    name: dto.company,
    period: UNKNOWN_PERIOD,
    status: mapAnalysisStatus(dto.status),
    createdAt: dto.created_at,
    sources: [],
    documentsProcessed: dto.file_count ?? 0,
    findingsOpen: open,
    // The list envelope reports open_count only; the detail envelope is authoritative.
    findingsTotal: open,
    amountAtRiskCents: 0,
  };
}

export function mapPilotDetail(envelope: PilotDetailEnvelope): {
  analysis: Analysis;
  findings: Finding[];
  unmapped: MappedFindings["unmapped"];
  files: PilotFileDto[];
  records: PilotRecordCountDto[];
  connections: ConnectionDto[];
} {
  const base = mapPilotRow(envelope.pilot);
  const files = envelope.files ?? [];
  const records = envelope.records ?? [];
  const connections = envelope.connections ?? [];
  const { findings, unmapped } = mapFindings(envelope.findings ?? [], envelope.pilot.id);

  const openFindings = findings.filter((finding) => finding.state === "open");
  const recordCount = records.reduce((sum, row) => sum + (row.count ?? 0), 0);

  return {
    analysis: {
      ...base,
      sources: [...connections.map(mapConnectionSource), ...files.map(mapFileSource)],
      documentsProcessed: recordCount || files.length,
      findingsOpen: openFindings.length,
      findingsTotal: findings.length,
      amountAtRiskCents: openFindings.reduce((sum, finding) => sum + finding.amountCents, 0),
    },
    findings,
    unmapped,
    files,
    records,
    connections,
  };
}

export function mapQuickBooksStatus(
  envelope: QuickBooksStatusEnvelope,
): QuickBooksConnectionStatus {
  if (!envelope.configured) {
    return {
      connected: false,
      message:
        "QuickBooks Online is not configured on the backend for this environment. An administrator must configure the connection before syncing.",
    };
  }
  const connection = envelope.connection;
  const connected = connection?.status === "connected";
  return {
    connected,
    ...(connection?.realm_id ? { realmLabel: `Realm ${connection.realm_id}` } : {}),
    ...(connection?.updated_at ? { lastSyncAt: connection.updated_at } : {}),
    ...(connected
      ? {}
      : {
          message: connection
            ? `QuickBooks Online connection status is "${connection.status}". Reconnect from the secure workspace.`
            : "No QuickBooks Online connection exists for this analysis yet.",
        }),
  };
}

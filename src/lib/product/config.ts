/**
 * Runtime mode + capability resolution.
 *
 * The preserved AP Exception Desk backend owns reconciliation, QuickBooks OAuth,
 * file processing, evidence, workflow state, auth and audit events. This Lovable
 * shell is NOT directly connected to it yet, so modes are explicit and fail closed:
 *
 * - demo         default. Visibly synthetic records only. No network calls.
 * - secure-link  VITE_SECURE_WORKSPACE_URL is set. Every real action is handed off to
 *                the preserved secure sign-in workspace. Authenticated data
 *                capabilities are OFF: this shell exposes no analyses, findings or
 *                evidence at all — synthetic or otherwise.
 * - api          VITE_API_BASE_URL *and* VITE_API_CONTRACT_VERSION=v1 are both set.
 *                Future typed gateway against the real /api routes. Partial or
 *                mismatched configuration never silently downgrades to guessing.
 */

export type ProductMode = "demo" | "secure-link" | "api";

export const SUPPORTED_CONTRACT_VERSION = "v1";

export type Capability =
  | "session_auth"
  | "access_request"
  | "list_analyses"
  | "analysis_detail"
  | "create_analysis"
  | "upload_files"
  | "reconcile"
  | "finding_detail"
  | "finding_disposition"
  | "finding_assign"
  | "finding_resolve"
  | "finding_dismiss"
  | "resolution_notes"
  | "finding_audit_history"
  | "evidence_documents"
  | "quickbooks_connect"
  | "quickbooks_sync"
  | "pricing_plans"
  | "operational_jobs";

export type Capabilities = Readonly<Record<Capability, boolean>>;

export interface ProductConfig {
  readonly mode: ProductMode;
  readonly apiBaseUrl: string | null;
  readonly secureWorkspaceUrl: string | null;
  readonly contractVersion: string | null;
  readonly capabilities: Capabilities;
  /** Configuration problems, surfaced in Settings — never thrown at users mid-workflow. */
  readonly warnings: readonly string[];
}

export interface ProductEnv {
  VITE_API_BASE_URL?: string | undefined;
  VITE_API_CONTRACT_VERSION?: string | undefined;
  VITE_SECURE_WORKSPACE_URL?: string | undefined;
}

/**
 * URL safety: absolute https only (http allowed for localhost development),
 * no embedded credentials, no query/hash smuggling, trailing slashes trimmed.
 */
export function safeExternalUrl(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed || /\s/.test(trimmed)) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !(url.protocol === "http:" && isLocal)) return null;
  if (url.username || url.password) return null;
  if (url.search || url.hash) return null;
  return `${url.origin}${url.pathname.replace(/\/+$/, "")}`;
}

const NOTHING: Capabilities = {
  session_auth: false,
  access_request: false,
  list_analyses: false,
  analysis_detail: false,
  create_analysis: false,
  upload_files: false,
  reconcile: false,
  finding_detail: false,
  finding_disposition: false,
  finding_assign: false,
  finding_resolve: false,
  finding_dismiss: false,
  resolution_notes: false,
  finding_audit_history: false,
  evidence_documents: false,
  quickbooks_connect: false,
  quickbooks_sync: false,
  pricing_plans: false,
  operational_jobs: false,
};

/** Demo mode drives every screen so the workflow is reviewable end to end. */
const DEMO_CAPABILITIES: Capabilities = {
  session_auth: true,
  access_request: true,
  list_analyses: true,
  analysis_detail: true,
  create_analysis: true,
  upload_files: true,
  reconcile: true,
  finding_detail: true,
  finding_disposition: true,
  finding_assign: true,
  finding_resolve: true,
  finding_dismiss: true,
  resolution_notes: true,
  finding_audit_history: true,
  evidence_documents: true,
  quickbooks_connect: false,
  quickbooks_sync: false,
  pricing_plans: true,
  operational_jobs: true,
};

/**
 * secure-link: nothing real happens in this shell. Every production action is a
 * handoff to the preserved workspace, so real capabilities stay off.
 */
const SECURE_LINK_CAPABILITIES: Capabilities = {
  ...NOTHING,
  // Marketing-only reads. No customer or synthetic record is presented as data.
  pricing_plans: true,
};

/**
 * api: only the routes the preserved backend actually exposes.
 * Auth stays with the backend's own secure workspace, so session_auth is off;
 * there is no reconcile, pricing or ops-jobs route, so those stay off too.
 */
const API_CAPABILITIES: Capabilities = {
  ...NOTHING,
  list_analyses: true,
  analysis_detail: true,
  create_analysis: true,
  upload_files: true,
  finding_detail: true,
  finding_disposition: true,
  // PATCH /api/findings/:id supports assigned_to and status open|resolved only.
  finding_assign: true,
  finding_resolve: true,
  // No dismissed state, no resolution note, no per-finding audit or document URL.
  finding_dismiss: false,
  resolution_notes: false,
  finding_audit_history: false,
  evidence_documents: false,
  quickbooks_connect: true,
  quickbooks_sync: true,
};

export function resolveProductConfig(env: ProductEnv = {}): ProductConfig {
  const warnings: string[] = [];

  const rawApi = env.VITE_API_BASE_URL?.trim() || "";
  const apiBaseUrl = safeExternalUrl(rawApi);
  if (rawApi && !apiBaseUrl) {
    warnings.push("VITE_API_BASE_URL is not a safe absolute https URL and was ignored.");
  }

  const rawSecure = env.VITE_SECURE_WORKSPACE_URL?.trim() || "";
  const secureWorkspaceUrl = safeExternalUrl(rawSecure);
  if (rawSecure && !secureWorkspaceUrl) {
    warnings.push("VITE_SECURE_WORKSPACE_URL is not a safe absolute https URL and was ignored.");
  }

  const contractVersion = env.VITE_API_CONTRACT_VERSION?.trim() || null;

  const contractOk = contractVersion === SUPPORTED_CONTRACT_VERSION;
  const apiRequested = Boolean(apiBaseUrl) || Boolean(contractVersion);

  let mode: ProductMode = secureWorkspaceUrl ? "secure-link" : "demo";

  if (apiBaseUrl && contractOk) {
    mode = "api";
  } else if (apiRequested) {
    // Fail closed: never call a speculative contract.
    if (!apiBaseUrl) {
      warnings.push(
        "API mode disabled: VITE_API_CONTRACT_VERSION is set without a usable VITE_API_BASE_URL.",
      );
    } else {
      warnings.push(
        `API mode disabled: VITE_API_CONTRACT_VERSION must be "${SUPPORTED_CONTRACT_VERSION}" (received ${
          contractVersion ? `"${contractVersion}"` : "nothing"
        }).`,
      );
    }
  }

  const capabilities =
    mode === "api"
      ? API_CAPABILITIES
      : mode === "secure-link"
        ? SECURE_LINK_CAPABILITIES
        : DEMO_CAPABILITIES;

  return {
    mode,
    apiBaseUrl: mode === "api" ? apiBaseUrl : null,
    secureWorkspaceUrl,
    contractVersion: mode === "api" ? contractVersion : null,
    capabilities,
    warnings,
  };
}

export function secureWorkspacePath(config: ProductConfig, path: string): string | null {
  if (!config.secureWorkspaceUrl) return null;
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${config.secureWorkspaceUrl}${suffix}`;
}

export const MODE_BANNERS: Record<ProductMode, string | null> = {
  demo: "Demo mode — synthetic records. Not customer data and not a proof of results.",
  "secure-link":
    "Preview mode — this shell holds no analyses. Real work happens in the secure AP Exception Desk workspace.",
  api: null,
};

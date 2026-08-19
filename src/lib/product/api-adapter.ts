/**
 * API adapter — typed gateway for the preserved AP Exception Desk backend.
 *
 * Only enabled when VITE_API_BASE_URL and VITE_API_CONTRACT_VERSION=v1 are both
 * set (see config.ts). It calls the routes the backend actually exposes:
 *
 *   GET|POST /api/pilots
 *   GET      /api/pilots/:id
 *   POST     /api/pilots/:id/files            (multipart)
 *   PATCH    /api/findings/:id
 *   GET      /api/integrations/quickbooks/status?pilotId=
 *   GET      /api/integrations/quickbooks/start?pilotId=
 *   POST     /api/integrations/quickbooks/sync
 *
 * Anything the backend does not expose throws `unsupported` instead of guessing a
 * contract. Auth is not exposed here: the backend keeps its own secure sign-in
 * workspace, so this shell is not a connected authentication surface.
 */
import {
  ProductApiError,
  type Analysis,
  type CreateAnalysisInput,
  type Finding,
  type FindingQuery,
  type Integration,
  type OperationalJob,
  type PricingPlan,
  type ProductApi,
  type QuickBooksConnectionStatus,
  type SessionUser,
} from "./types";

interface PilotDetail extends Analysis {
  findings?: Finding[];
}

function unsupported(what: string): never {
  throw new ProductApiError(
    `${what} is not exposed by the AP Exception Desk backend contract. Use the secure workspace.`,
    "unsupported",
  );
}

export function createApiProductApi(baseUrl: string): ProductApi {
  const root = baseUrl.replace(/\/+$/, "");

  async function request<T>(
    path: string,
    init: Omit<RequestInit, "body"> & { body?: unknown; raw?: BodyInit } = {},
  ): Promise<T> {
    const { body, raw, ...rest } = init;
    let response: Response;
    try {
      response = await fetch(`${root}${path}`, {
        ...rest,
        credentials: "include",
        headers: {
          Accept: "application/json",
          ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
          ...(rest.headers ?? {}),
        },
        body: raw ?? (body !== undefined ? JSON.stringify(body) : null),
      });
    } catch (cause) {
      throw new ProductApiError(
        `Could not reach the AP Exception Desk backend: ${(cause as Error).message}`,
        "network",
      );
    }

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new ProductApiError(
        `Request failed [${response.status}] ${path}: ${text}`,
        response.status === 401
          ? "unauthorized"
          : response.status === 403
            ? "forbidden"
            : response.status === 404
              ? "not_found"
              : "server",
      );
    }

    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  async function getPilot(id: string): Promise<PilotDetail> {
    return request<PilotDetail>(`/api/pilots/${encodeURIComponent(id)}`);
  }

  return {
    mode: "api",

    signIn: () => unsupported("Sign-in"),
    signOut: () => unsupported("Sign-out"),
    getSession: async () => null,
    requestAccess: () => unsupported("Access requests"),

    listAnalyses: () => request<Analysis[]>("/api/pilots"),
    getAnalysis: (id) => getPilot(id),
    createAnalysis: (input: CreateAnalysisInput) =>
      request<Analysis>("/api/pilots", { method: "POST", body: input }),
    reconcileAnalysis: () => unsupported("Triggering reconciliation from this shell"),

    uploadAnalysisFiles: (id, files) => {
      const form = new FormData();
      for (const file of files) form.append("files", file, file.name);
      return request<Analysis>(`/api/pilots/${encodeURIComponent(id)}/files`, {
        method: "POST",
        raw: form,
      });
    },

    listFindings: async (query: FindingQuery) => {
      const pilot = await getPilot(query.analysisId);
      const findings = pilot.findings ?? [];
      return findings.filter(
        (finding) =>
          (!query.category || finding.category === query.category) &&
          (!query.state || finding.state === query.state),
      );
    },
    getFinding: () => unsupported("Fetching a single finding"),
    assignFinding: (id, assignee) => patchFinding(id, { state: "assigned", assignee }),
    resolveFinding: (id, note) => patchFinding(id, { state: "resolved", note }),
    dismissFinding: (id, note) => patchFinding(id, { state: "dismissed", note }),

    getQuickBooksStatus: (analysisId) =>
      request<QuickBooksConnectionStatus>(
        `/api/integrations/quickbooks/status?pilotId=${encodeURIComponent(analysisId)}`,
      ),
    getQuickBooksStartUrl: (analysisId) =>
      `${root}/api/integrations/quickbooks/start?pilotId=${encodeURIComponent(analysisId)}`,
    syncQuickBooks: (analysisId) =>
      request<QuickBooksConnectionStatus>("/api/integrations/quickbooks/sync", {
        method: "POST",
        body: { pilotId: analysisId },
      }),

    listIntegrations: (): Promise<Integration[]> =>
      Promise.resolve([
        {
          id: "quickbooks",
          name: "QuickBooks Online",
          status: "live",
          summary: "Read-only sync owned by the backend connection path.",
        },
        {
          id: "csv",
          name: "CSV / export upload",
          status: "live",
          summary: "AP register, PO list, receipts and vendor statements.",
        },
      ]),
    listPricingPlans: (): Promise<PricingPlan[]> => unsupported("Pricing plans"),
    listOperationalJobs: (): Promise<OperationalJob[]> => unsupported("Operational job history"),
  };

  function patchFinding(
    id: string,
    body: { state: string; assignee?: string; note?: string },
  ): Promise<Finding> {
    return request<Finding>(`/api/findings/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body,
    });
  }
}

export type { SessionUser };

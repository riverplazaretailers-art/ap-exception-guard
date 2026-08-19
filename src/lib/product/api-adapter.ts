/**
 * API adapter — typed gateway for the preserved AP Exception Desk backend (v1).
 *
 * Enabled only when VITE_API_BASE_URL and VITE_API_CONTRACT_VERSION=v1 are both
 * set (see config.ts). Every call below matches the authoritative contract:
 *
 *   GET   /api/pilots                                  -> { pilots }
 *   POST  /api/pilots            { company }           -> { pilot }
 *   GET   /api/pilots/:id                              -> { pilot, files, records, connections, findings }
 *   POST  /api/pilots/:id/files  multipart file+kind    -> { file, recordsCreated, findingsCreated }
 *   PATCH /api/findings/:id      { status?, assigned_to? } -> { ok, status, assigned_to }
 *   GET   /api/integrations/quickbooks/status?pilotId=  -> { configured, connection }
 *   GET   /api/integrations/quickbooks/start?pilotId=
 *   POST  /api/integrations/quickbooks/sync { pilotId } -> { records, findings }
 *
 * The backend does NOT persist resolution notes, an "assigned" state or a
 * "dismissed" state, so this adapter refuses those instead of faking them.
 * Auth is not exposed here: the backend keeps its own secure sign-in workspace.
 */
import {
  mapPilotDetail,
  mapPilotRow,
  mapQuickBooksStatus,
  type FileUploadedEnvelope,
  type FindingPatchEnvelope,
  type PilotCreatedEnvelope,
  type PilotDetailEnvelope,
  type PilotListEnvelope,
  type QuickBooksStatusEnvelope,
  type QuickBooksSyncEnvelope,
} from "./backend-dto";
import {
  ProductApiError,
  type Analysis,
  type AnalysisFileUpload,
  type CreateAnalysisInput,
  type Finding,
  type FindingQuery,
  type Integration,
  type OperationalJob,
  type PricingPlan,
  type ProductApi,
  type QuickBooksConnectionStatus,
  type QuickBooksSyncOutcome,
  type SessionUser,
} from "./types";

function unsupportedError(what: string): ProductApiError {
  return new ProductApiError(
    `${what} is not part of the AP Exception Desk v1 backend contract. Use the secure workspace.`,
    "unsupported",
  );
}

/** Always a rejected promise so callers handle it as a normal API failure. */
function unsupported<T>(what: string): Promise<T> {
  return Promise.reject(unsupportedError(what));
}

export function createApiProductApi(baseUrl: string): ProductApi {
  const root = baseUrl.replace(/\/+$/, "");

  function requireAnalysisId(analysisId: string | undefined): string {
    if (!analysisId) {
      throw unsupportedError("Finding dispositions without their analysis context");
    }
    return analysisId;
  }

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
          // Multipart bodies must keep the boundary the runtime generates.
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

  function pilotDetail(id: string): Promise<PilotDetailEnvelope> {
    return request<PilotDetailEnvelope>(`/api/pilots/${encodeURIComponent(id)}`);
  }

  async function detail(id: string) {
    return mapPilotDetail(await pilotDetail(id));
  }

  async function findFinding(id: string, analysisId?: string): Promise<Finding> {
    if (!analysisId) {
      throw new ProductApiError(
        "The v1 contract has no single-finding route; open the finding from its analysis.",
        "unsupported",
      );
    }
    const { findings } = await detail(analysisId);
    const found = findings.find((finding) => finding.id === id);
    if (!found) throw new ProductApiError(`Finding ${id} was not found.`, "not_found");
    return found;
  }

  /** PATCH /api/findings/:id — only status and assigned_to exist. */
  async function patchFinding(
    id: string,
    body: { status?: "open" | "resolved"; assigned_to?: string },
  ): Promise<FindingPatchEnvelope> {
    return request<FindingPatchEnvelope>(`/api/findings/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body,
    });
  }

  /**
   * After a disposition, re-read the pilot so the UI reflects authoritative state
   * rather than a locally assumed transition.
   */
  async function patchThenReread(
    findingId: string,
    analysisId: string,
    body: { status?: "open" | "resolved"; assigned_to?: string },
  ): Promise<Finding> {
    await patchFinding(findingId, body);
    return findFinding(findingId, analysisId);
  }

  return {
    mode: "api",

    signIn: () => unsupported<SessionUser>("Sign-in"),
    signOut: () => unsupported<void>("Sign-out"),
    getSession: async () => null,
    requestAccess: () => unsupported<void>("Access requests"),

    listAnalyses: async () => {
      const envelope = await request<PilotListEnvelope>("/api/pilots");
      return (envelope.pilots ?? []).map(mapPilotRow);
    },

    getAnalysis: async (id) => (await detail(id)).analysis,

    createAnalysis: async (input: CreateAnalysisInput) => {
      // The backend accepts exactly { company }.
      const envelope = await request<PilotCreatedEnvelope>("/api/pilots", {
        method: "POST",
        body: { company: input.name },
      });
      return mapPilotRow(envelope.pilot);
    },

    reconcileAnalysis: () =>
      unsupported<Analysis>("Triggering reconciliation from this shell"),

    /** One request per file, each with its own explicit kind. Never "files". */
    uploadAnalysisFiles: async (id: string, uploads: AnalysisFileUpload[]) => {
      for (const upload of uploads) {
        const form = new FormData();
        form.append("file", upload.file, upload.file.name);
        form.append("kind", upload.kind);
        await request<FileUploadedEnvelope>(`/api/pilots/${encodeURIComponent(id)}/files`, {
          method: "POST",
          raw: form,
        });
      }
      return (await detail(id)).analysis;
    },

    listFindings: async (query: FindingQuery) => {
      const { findings } = await detail(query.analysisId);
      return findings.filter(
        (finding) =>
          (!query.category || finding.category === query.category) &&
          (!query.state || finding.state === query.state),
      );
    },

    getFinding: (id, analysisId) => findFinding(id, analysisId),

    /** Assignment keeps the finding open and only sends assigned_to. */
    assignFinding: async (id, assignee, analysisId) =>
      patchThenReread(id, requireAnalysisId(analysisId), {
        status: "open",
        assigned_to: assignee,
      }),

    /**
     * Resolution sends only status + the current assignee. Notes are dropped
     * because the backend cannot persist them (the UI hides the note field).
     */
    resolveFinding: async (id, _note, analysisId) => {
      const scope = requireAnalysisId(analysisId);
      const current = await findFinding(id, scope);
      return patchThenReread(id, scope, {
        status: "resolved",
        assigned_to: current.assignee ?? "",
      });
    },

    /** The backend has no dismissed state, so this shell must not offer it. */
    dismissFinding: () => unsupported<Finding>("Dismissing a finding"),

    getQuickBooksStatus: async (analysisId): Promise<QuickBooksConnectionStatus> =>
      mapQuickBooksStatus(
        await request<QuickBooksStatusEnvelope>(
          `/api/integrations/quickbooks/status?pilotId=${encodeURIComponent(analysisId)}`,
        ),
      ),

    getQuickBooksStartUrl: (analysisId) =>
      `${root}/api/integrations/quickbooks/start?pilotId=${encodeURIComponent(analysisId)}`,

    syncQuickBooks: async (analysisId): Promise<QuickBooksSyncOutcome> => {
      const sync = await request<QuickBooksSyncEnvelope>("/api/integrations/quickbooks/sync", {
        method: "POST",
        body: { pilotId: analysisId },
      });
      // Sync counts are not a connection status: re-read both authoritative reads.
      const [analysis, status] = [
        (await detail(analysisId)).analysis,
        mapQuickBooksStatus(
          await request<QuickBooksStatusEnvelope>(
            `/api/integrations/quickbooks/status?pilotId=${encodeURIComponent(analysisId)}`,
          ),
        ),
      ];
      return {
        records: sync.records ?? 0,
        findings: sync.findings ?? 0,
        analysis,
        status,
      };
    },

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
    listPricingPlans: () => unsupported<PricingPlan[]>("Pricing plans"),
    listOperationalJobs: () => unsupported<OperationalJob[]>("Operational job history"),
  };
}

export type { SessionUser };

import {
  ProductApiError,
  type AccessRequestInput,
  type Analysis,
  type CreateAnalysisInput,
  type Finding,
  type FindingQuery,
  type Integration,
  type OperationalJob,
  type PricingPlan,
  type ProductApi,
  type SessionUser,
} from "./types";

/**
 * HTTP adapter. Talks to the authoritative AP Exception Desk backend.
 * Configured entirely by VITE_API_BASE_URL — no secrets in source.
 * Auth is carried by the backend session cookie (credentials: "include").
 */
export function createHttpProductApi(baseUrl: string): ProductApi {
  const root = baseUrl.replace(/\/+$/, "");

  async function request<T>(
    path: string,
    init: Omit<RequestInit, "body"> & { body?: unknown } = {},
  ): Promise<T> {
    const { body, ...rest } = init;
    const rawBody = body !== undefined ? JSON.stringify(body) : null;
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
        body: rawBody,
      });
    } catch (cause) {
      throw new ProductApiError(
        `Could not reach the AP Exception Desk API: ${(cause as Error).message}`,
        "network",
      );
    }

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new ProductApiError(
        `API request failed [${response.status}] ${path}: ${text}`,
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

  return {
    mode: "http",

    signIn: (email, password) =>
      request<SessionUser>("/v1/auth/sign-in", {
        method: "POST",
        body: { email, password },
      }),
    signOut: () => request<void>("/v1/auth/sign-out", { method: "POST" }),
    getSession: async () => {
      try {
        return await request<SessionUser>("/v1/auth/session");
      } catch (error) {
        if (error instanceof ProductApiError && error.code === "unauthorized") return null;
        throw error;
      }
    },
    requestAccess: (input: AccessRequestInput) =>
      request<void>("/v1/access-requests", { method: "POST", body: input }),

    listAnalyses: () => request<Analysis[]>("/v1/analyses"),
    getAnalysis: (id) => request<Analysis>(`/v1/analyses/${encodeURIComponent(id)}`),
    createAnalysis: (input: CreateAnalysisInput) =>
      request<Analysis>("/v1/analyses", { method: "POST", body: input }),
    reconcileAnalysis: (id) =>
      request<Analysis>(`/v1/analyses/${encodeURIComponent(id)}/reconcile`, {
        method: "POST",
      }),

    listFindings: (query: FindingQuery) => {
      const params = new URLSearchParams({ analysisId: query.analysisId });
      if (query.category) params.set("category", query.category);
      if (query.state) params.set("state", query.state);
      return request<Finding[]>(`/v1/findings?${params.toString()}`);
    },
    getFinding: (id) => request<Finding>(`/v1/findings/${encodeURIComponent(id)}`),
    assignFinding: (id, assignee) =>
      request<Finding>(`/v1/findings/${encodeURIComponent(id)}/assign`, {
        method: "POST",
        body: { assignee },
      }),
    resolveFinding: (id, note) =>
      request<Finding>(`/v1/findings/${encodeURIComponent(id)}/resolve`, {
        method: "POST",
        body: { note },
      }),
    dismissFinding: (id, note) =>
      request<Finding>(`/v1/findings/${encodeURIComponent(id)}/dismiss`, {
        method: "POST",
        body: { note },
      }),

    listIntegrations: () => request<Integration[]>("/v1/integrations"),
    listPricingPlans: () => request<PricingPlan[]>("/v1/pricing-plans"),
    listOperationalJobs: () => request<OperationalJob[]>("/v1/ops/jobs"),
  };
}
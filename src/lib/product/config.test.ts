import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveProductConfig, safeExternalUrl } from "./config";
import { createProductApi } from "./index";
import { createApiProductApi } from "./api-adapter";
import { createDemoProductApi } from "./demo-adapter";

const API = "https://api.apexceptiondesk.example";
const WORKSPACE = "https://app.apexceptiondesk.example";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("mode selection", () => {
  it("defaults to demo with no configuration", () => {
    const config = resolveProductConfig({});
    expect(config.mode).toBe("demo");
    expect(config.apiBaseUrl).toBeNull();
    expect(config.capabilities.create_analysis).toBe(true);
  });

  it("uses secure-link when only the workspace URL is set", () => {
    const config = resolveProductConfig({ VITE_SECURE_WORKSPACE_URL: WORKSPACE });
    expect(config.mode).toBe("secure-link");
    expect(config.secureWorkspaceUrl).toBe(WORKSPACE);
    expect(config.capabilities.create_analysis).toBe(false);
    expect(config.capabilities.access_request).toBe(false);
    expect(config.capabilities.finding_disposition).toBe(false);
  });

  it("enables api mode only with base URL plus contract v1", () => {
    const config = resolveProductConfig({
      VITE_API_BASE_URL: API,
      VITE_API_CONTRACT_VERSION: "v1",
    });
    expect(config.mode).toBe("api");
    expect(config.apiBaseUrl).toBe(API);
    expect(config.capabilities.session_auth).toBe(false);
    expect(config.capabilities.reconcile).toBe(false);
    expect(config.capabilities.quickbooks_sync).toBe(true);
  });

  it("prefers api mode over an available secure workspace", () => {
    const config = resolveProductConfig({
      VITE_API_BASE_URL: API,
      VITE_API_CONTRACT_VERSION: "v1",
      VITE_SECURE_WORKSPACE_URL: WORKSPACE,
    });
    expect(config.mode).toBe("api");
    expect(config.secureWorkspaceUrl).toBe(WORKSPACE);
  });
});

describe("fail-closed partial configuration", () => {
  it("does not enter api mode without a contract version", () => {
    const config = resolveProductConfig({ VITE_API_BASE_URL: API });
    expect(config.mode).toBe("demo");
    expect(config.apiBaseUrl).toBeNull();
    expect(config.warnings.join(" ")).toContain("API mode disabled");
  });

  it("does not enter api mode on a contract mismatch", () => {
    const config = resolveProductConfig({
      VITE_API_BASE_URL: API,
      VITE_API_CONTRACT_VERSION: "v2",
    });
    expect(config.mode).toBe("demo");
    expect(config.warnings.join(" ")).toContain("v1");
  });

  it("falls back to secure-link, never to a guessed contract", () => {
    const config = resolveProductConfig({
      VITE_API_CONTRACT_VERSION: "v1",
      VITE_SECURE_WORKSPACE_URL: WORKSPACE,
    });
    expect(config.mode).toBe("secure-link");
    expect(config.apiBaseUrl).toBeNull();
  });

  it("ignores an unsafe base URL and stays out of api mode", () => {
    const config = resolveProductConfig({
      VITE_API_BASE_URL: "http://api.internal",
      VITE_API_CONTRACT_VERSION: "v1",
    });
    expect(config.mode).toBe("demo");
    expect(config.warnings.some((w) => w.includes("VITE_API_BASE_URL"))).toBe(true);
  });
});

describe("URL safety", () => {
  it("accepts https origins and trims trailing slashes", () => {
    expect(safeExternalUrl("https://app.example.com/")).toBe("https://app.example.com");
    expect(safeExternalUrl("https://app.example.com/desk/")).toBe("https://app.example.com/desk");
  });

  it("allows http only on localhost", () => {
    expect(safeExternalUrl("http://localhost:8787")).toBe("http://localhost:8787");
    expect(safeExternalUrl("http://example.com")).toBeNull();
  });

  it("rejects credentials, other schemes, whitespace and query smuggling", () => {
    expect(safeExternalUrl("https://user:pass@example.com")).toBeNull();
    expect(safeExternalUrl("javascript:alert(1)")).toBeNull();
    expect(safeExternalUrl("data:text/html,<b>")).toBeNull();
    expect(safeExternalUrl("https://example.com /x")).toBeNull();
    expect(safeExternalUrl("https://example.com?token=abc")).toBeNull();
    expect(safeExternalUrl("https://example.com#t")).toBeNull();
    expect(safeExternalUrl("/relative")).toBeNull();
    expect(safeExternalUrl(undefined)).toBeNull();
  });
});

describe("demo isolation", () => {
  it("selects the demo adapter for demo and secure-link modes", () => {
    expect(createProductApi(resolveProductConfig({})).mode).toBe("demo");
    expect(
      createProductApi(resolveProductConfig({ VITE_SECURE_WORKSPACE_URL: WORKSPACE })).mode,
    ).toBe("demo");
    expect(
      createProductApi(
        resolveProductConfig({ VITE_API_BASE_URL: API, VITE_API_CONTRACT_VERSION: "v1" }),
      ).mode,
    ).toBe("api");
  });

  it("never performs a network call in demo or secure-link mode", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    for (const env of [{}, { VITE_SECURE_WORKSPACE_URL: WORKSPACE }]) {
      const api = createProductApi(resolveProductConfig(env));
      const analyses = await api.listAnalyses();
      const [analysis] = analyses;
      await api.listFindings({ analysisId: analysis!.id });
      await api.listIntegrations();
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("no speculative contract outside api mode", () => {
  it("only the api adapter issues requests, and only against real /api routes", async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        calls.push(String(url));
        return new Response(JSON.stringify({ id: "p1", findings: [] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }),
    );

    const api = createApiProductApi(API);
    await api.listAnalyses();
    await api.getAnalysis("p1");
    await api.listFindings({ analysisId: "p1" });
    await api.assignFinding("f1", "A. Controller");
    await api.getQuickBooksStatus!("p1");
    await api.syncQuickBooks!("p1");

    expect(calls).toEqual([
      `${API}/api/pilots`,
      `${API}/api/pilots/p1`,
      `${API}/api/pilots/p1`,
      `${API}/api/findings/f1`,
      `${API}/api/integrations/quickbooks/status?pilotId=p1`,
      `${API}/api/integrations/quickbooks/sync`,
    ]);
    expect(calls.some((call) => call.includes("/v1/"))).toBe(false);
    expect(api.getQuickBooksStartUrl!("p1")).toBe(
      `${API}/api/integrations/quickbooks/start?pilotId=p1`,
    );
  });

  it("refuses actions the backend does not expose instead of guessing", async () => {
    const api = createApiProductApi(API);
    await expect(api.reconcileAnalysis("p1")).rejects.toMatchObject({ code: "unsupported" });
    await expect(api.signIn("a@b.com", "x")).rejects.toMatchObject({ code: "unsupported" });
    await expect(api.requestAccess({ name: "a", email: "a@b.com", company: "c" })).rejects.toMatchObject({
      code: "unsupported",
    });
    await expect(api.listPricingPlans()).rejects.toMatchObject({ code: "unsupported" });
    await expect(api.listOperationalJobs()).rejects.toMatchObject({ code: "unsupported" });
    await expect(api.getSession()).resolves.toBeNull();
  });

  it("keeps the demo adapter free of any backend contract knowledge", () => {
    expect(createDemoProductApi().mode).toBe("demo");
  });
});

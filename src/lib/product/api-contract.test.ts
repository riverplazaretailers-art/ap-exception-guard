import { afterEach, describe, expect, it, vi } from "vitest";
import { createApiProductApi } from "./api-adapter";
import {
  mapFinding,
  mapPilotDetail,
  mapQuickBooksStatus,
  type FindingDto,
  type PilotDetailEnvelope,
} from "./backend-dto";

const API = "https://api.apexceptiondesk.example";

interface RecordedCall {
  url: string;
  method: string;
  body: unknown;
  headers: Record<string, string>;
}

function mockFetch(responder: (url: string, init: RequestInit) => unknown) {
  const calls: RecordedCall[] = [];
  const spy = vi.fn(async (url: string, init: RequestInit = {}) => {
    calls.push({
      url: String(url),
      method: (init.method ?? "GET").toUpperCase(),
      body: init.body,
      headers: (init.headers ?? {}) as Record<string, string>,
    });
    return new Response(JSON.stringify(responder(String(url), init)), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  });
  vi.stubGlobal("fetch", spy);
  return calls;
}

const pilotRow = {
  id: "p-1",
  company: "Northline Freight",
  status: "ready",
  created_at: "2026-08-01T10:00:00Z",
  retention_until: "2027-08-01T10:00:00Z",
  open_count: 2,
  file_count: 3,
};

const findingDto: FindingDto = {
  id: "f-1",
  type: "Possible duplicate",
  severity: "High",
  vendor: "Northline Freight",
  invoice: "INV-44821",
  amount: 12450.75,
  summary: "Two payments reference the same invoice number.",
  question: "Was the second payment intentional?",
  evidence: "bill 8821 paid 2026-07-02 and 2026-07-19",
  status: "open",
  assigned_to: "",
  created_at: "2026-08-02T09:00:00Z",
  updated_at: "2026-08-02T09:00:00Z",
};

const detailEnvelope: PilotDetailEnvelope = {
  pilot: pilotRow,
  files: [
    {
      id: "file-1",
      name: "ap_register.csv",
      content_type: "text/csv",
      size: 2048,
      kind: "invoice_export",
      status: "parsed",
      uploaded_at: "2026-08-01T11:00:00Z",
    },
  ],
  records: [{ kind: "invoice", count: 240 }],
  connections: [
    {
      provider: "quickbooks",
      status: "connected",
      realm_id: "4620816365",
      updated_at: "2026-08-02T08:00:00Z",
    },
  ],
  findings: [findingDto, { ...findingDto, id: "f-2", status: "resolved", amount: 900 }],
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("envelope unwrapping", () => {
  it("unwraps { pilots } from GET /api/pilots", async () => {
    const calls = mockFetch(() => ({ pilots: [pilotRow] }));
    const api = createApiProductApi(API);
    const analyses = await api.listAnalyses();
    expect(calls[0]!.url).toBe(`${API}/api/pilots`);
    expect(analyses).toHaveLength(1);
    expect(analyses[0]!.id).toBe("p-1");
    expect(analyses[0]!.name).toBe("Northline Freight");
    expect(analyses[0]!.status).toBe("ready");
  });

  it("composes an analysis from the detail envelope", async () => {
    mockFetch(() => detailEnvelope);
    const analysis = await createApiProductApi(API).getAnalysis("p-1");
    expect(analysis.documentsProcessed).toBe(240);
    expect(analysis.findingsTotal).toBe(2);
    expect(analysis.findingsOpen).toBe(1);
    // Only the open finding contributes to exposure: 12450.75 -> cents.
    expect(analysis.amountAtRiskCents).toBe(1245075);
    expect(analysis.sources.map((source) => source.kind)).toEqual(["quickbooks", "csv_upload"]);
  });

  it("sends only { company } on create and unwraps { pilot }", async () => {
    const calls = mockFetch(() => ({ pilot: pilotRow }));
    const created = await createApiProductApi(API).createAnalysis({
      name: "Northline Freight",
      period: "2026-07 to 2026-09",
      sourceKinds: ["csv_upload"],
      uploadedFileNames: ["ap_register.csv"],
    });
    const body = JSON.parse(String(calls[0]!.body));
    expect(Object.keys(body)).toEqual(["company"]);
    expect(body.company).toBe("Northline Freight");
    expect(created.id).toBe("p-1");
  });
});

describe("multipart upload", () => {
  it("sends one file plus one kind per request and never a files field", async () => {
    const calls = mockFetch((url) =>
      url.endsWith("/files")
        ? { file: detailEnvelope.files![0], recordsCreated: 12, findingsCreated: 2 }
        : detailEnvelope,
    );
    const api = createApiProductApi(API);
    const uploads = [
      { file: new File(["a,b"], "ap_register.csv", { type: "text/csv" }), kind: "invoice_export" as const },
      { file: new File(["c,d"], "pos.csv", { type: "text/csv" }), kind: "purchase_orders" as const },
    ];
    const analysis = await api.uploadAnalysisFiles!("p-1", uploads);

    const uploadCalls = calls.filter((call) => call.url.endsWith("/files"));
    expect(uploadCalls).toHaveLength(2);
    for (const [index, call] of uploadCalls.entries()) {
      expect(call.method).toBe("POST");
      const form = call.body as FormData;
      expect(form).toBeInstanceOf(FormData);
      expect([...form.keys()].sort()).toEqual(["file", "kind"]);
      expect(form.getAll("files")).toEqual([]);
      expect(form.get("kind")).toBe(uploads[index]!.kind);
      // Multipart must not carry a hand-set JSON content type.
      expect(call.headers["Content-Type"]).toBeUndefined();
    }
    // The analysis is re-read after the sequential uploads.
    expect(calls.at(-1)!.url).toBe(`${API}/api/pilots/p-1`);
    expect(analysis.findingsTotal).toBe(2);
  });
});

describe("finding dispositions", () => {
  it("assigns with { status: open, assigned_to } only", async () => {
    const calls = mockFetch((url) =>
      url.includes("/api/findings/")
        ? { ok: true, status: "open", assigned_to: "A. Controller" }
        : detailEnvelope,
    );
    await createApiProductApi(API).assignFinding("f-1", "A. Controller", "p-1");
    const patch = calls.find((call) => call.method === "PATCH")!;
    expect(patch.url).toBe(`${API}/api/findings/f-1`);
    const body = JSON.parse(String(patch.body));
    expect(body).toEqual({ status: "open", assigned_to: "A. Controller" });
    expect(Object.keys(body)).not.toContain("state");
    expect(Object.keys(body)).not.toContain("assignee");
    expect(Object.keys(body)).not.toContain("note");
  });

  it("resolves with the current assignee and re-reads authoritative detail", async () => {
    const resolvedEnvelope: PilotDetailEnvelope = {
      ...detailEnvelope,
      findings: [{ ...findingDto, status: "resolved", assigned_to: "A. Controller" }],
    };
    let patched = false;
    const calls = mockFetch((url) => {
      if (url.includes("/api/findings/")) {
        patched = true;
        return { ok: true, status: "resolved", assigned_to: "A. Controller" };
      }
      return patched
        ? resolvedEnvelope
        : {
            ...detailEnvelope,
            findings: [{ ...findingDto, assigned_to: "A. Controller" }],
          };
    });

    const finding = await createApiProductApi(API).resolveFinding(
      "f-1",
      "note the UI must not send",
      "p-1",
    );
    const patch = calls.find((call) => call.method === "PATCH")!;
    const body = JSON.parse(String(patch.body));
    expect(body).toEqual({ status: "resolved", assigned_to: "A. Controller" });
    expect(String(patch.body)).not.toContain("note");
    expect(finding.state).toBe("resolved");
    // PATCH is followed by a re-read of the pilot detail.
    expect(calls.at(-1)!.url).toBe(`${API}/api/pilots/p-1`);
  });

  it("refuses dismissal because the backend has no dismissed state", async () => {
    mockFetch(() => detailEnvelope);
    await expect(
      createApiProductApi(API).dismissFinding("f-1", "reason", "p-1"),
    ).rejects.toMatchObject({ code: "unsupported" });
  });

  it("refuses a disposition without analysis scope instead of guessing a route", async () => {
    mockFetch(() => detailEnvelope);
    await expect(createApiProductApi(API).assignFinding("f-1", "A. C")).rejects.toMatchObject({
      code: "unsupported",
    });
  });
});

describe("finding mapping", () => {
  it("maps every documented backend type", () => {
    const pairs: Array<[string, string]> = [
      ["Possible duplicate", "duplicate"],
      ["Missing purchase order", "missing_po"],
      ["Purchase order not found", "missing_po"],
      ["PO amount mismatch", "missing_po"],
      ["Receipt not found", "receipt_mismatch"],
      ["Receipt mismatch", "receipt_mismatch"],
      ["Statement invoice missing", "missing_statement_invoice"],
      ["Aged approval", "aged_approval"],
    ];
    for (const [type, category] of pairs) {
      const mapped = mapFinding({ ...findingDto, type }, "p-1");
      expect("category" in mapped && mapped.category).toBe(category);
    }
  });

  it("converts dollars to cents and lowercases severity", () => {
    const mapped = mapFinding({ ...findingDto, amount: 1234.56, severity: "Medium" }, "p-1");
    expect("amountCents" in mapped && mapped.amountCents).toBe(123456);
    expect("severity" in mapped && mapped.severity).toBe("medium");
  });

  it("carries summary, question and evidence text without inventing documents", () => {
    const mapped = mapFinding(findingDto, "p-1");
    if ("reason" in mapped) throw new Error("expected a mapped finding");
    expect(mapped.rationale).toBe(findingDto.summary);
    expect(mapped.question).toBe(findingDto.question);
    expect(mapped.evidenceNote).toContain("bill 8821");
    expect(mapped.evidence).toEqual([]);
    expect(mapped.audit).toEqual([]);
  });

  it("reports unmapped rows instead of inventing state", () => {
    const result = mapPilotDetail({
      ...detailEnvelope,
      findings: [
        { ...findingDto, id: "x1", type: "Cosmic anomaly" },
        { ...findingDto, id: "x2", status: "dismissed" },
      ],
    });
    expect(result.findings).toHaveLength(0);
    expect(result.unmapped.map((row) => row.id).sort()).toEqual(["x1", "x2"]);
  });

  it("never produces an assigned or dismissed UI state from the backend", () => {
    const states = (detailEnvelope.findings ?? []).map((dto) => {
      const mapped = mapFinding(dto, "p-1");
      return "state" in mapped ? mapped.state : "unmapped";
    });
    expect(states).not.toContain("assigned");
    expect(states).not.toContain("dismissed");
  });
});

describe("quickbooks", () => {
  it("maps status truthfully", () => {
    expect(
      mapQuickBooksStatus({
        configured: true,
        connection: {
          provider: "quickbooks",
          status: "connected",
          realm_id: "4620816365",
          updated_at: "2026-08-02T08:00:00Z",
        },
      }),
    ).toEqual({
      connected: true,
      realmLabel: "Realm 4620816365",
      lastSyncAt: "2026-08-02T08:00:00Z",
    });

    const revoked = mapQuickBooksStatus({
      configured: true,
      connection: { provider: "quickbooks", status: "revoked" },
    });
    expect(revoked.connected).toBe(false);
    expect(revoked.message).toContain("revoked");

    const unconfigured = mapQuickBooksStatus({ configured: false, connection: null });
    expect(unconfigured.connected).toBe(false);
    expect(unconfigured.message).toContain("not configured");
  });

  it("syncs, then refetches the pilot and the connection status", async () => {
    const calls = mockFetch((url) => {
      if (url.includes("/quickbooks/sync")) return { records: 240, findings: 6 };
      if (url.includes("/quickbooks/status")) {
        return {
          configured: true,
          connection: {
            provider: "quickbooks",
            status: "connected",
            realm_id: "4620816365",
            updated_at: "2026-08-02T08:00:00Z",
          },
        };
      }
      return detailEnvelope;
    });

    const outcome = await createApiProductApi(API).syncQuickBooks!("p-1");
    expect(JSON.parse(String(calls[0]!.body))).toEqual({ pilotId: "p-1" });
    expect(calls.map((call) => call.url)).toEqual([
      `${API}/api/integrations/quickbooks/sync`,
      `${API}/api/pilots/p-1`,
      `${API}/api/integrations/quickbooks/status?pilotId=p-1`,
    ]);
    expect(outcome.records).toBe(240);
    expect(outcome.findings).toBe(6);
    expect(outcome.analysis.id).toBe("p-1");
    expect(outcome.status.connected).toBe(true);
  });

  it("exposes the backend OAuth start URL without inventing parameters", () => {
    expect(createApiProductApi(API).getQuickBooksStartUrl!("p-1")).toBe(
      `${API}/api/integrations/quickbooks/start?pilotId=p-1`,
    );
  });
});

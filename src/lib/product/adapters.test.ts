import { beforeEach, describe, expect, it } from "vitest";
import { createDemoProductApi } from "./demo-adapter";
import { createApiProductApi } from "./api-adapter";
import { createProductApi } from "./index";
import { resolveProductConfig } from "./config";
import { ProductApiError, type ProductApi } from "./types";
import { allowedFindingActions, nextAnalysisStatus, stepForStatus } from "./workflow";
import { scrubPayload } from "@/lib/analytics";

describe("adapter resolution", () => {
  it("uses the demo adapter when nothing is configured", () => {
    expect(createProductApi(resolveProductConfig({})).mode).toBe("demo");
  });

  it("uses the API adapter when the base URL and contract version agree", () => {
    const config = resolveProductConfig({
      VITE_API_BASE_URL: "https://api.example.test",
      VITE_API_CONTRACT_VERSION: "v1",
    });
    expect(createProductApi(config).mode).toBe("api");
  });

  it("builds an API adapter without touching the network at construction time", () => {
    expect(createApiProductApi("https://api.example.test").mode).toBe("api");
  });
});

describe("demo adapter", () => {
  let api: ProductApi;

  beforeEach(() => {
    api = createDemoProductApi();
  });

  it("rejects a malformed sign-in", async () => {
    await expect(api.signIn("not-an-email", "x")).rejects.toBeInstanceOf(ProductApiError);
  });

  it("signs a demo controller in", async () => {
    const user = await api.signIn("controller@demo-account.example", "demo");
    expect(user.role).toBe("controller");
    expect(user.accountName).toContain("synthetic");
  });

  it("lists synthetic analyses including a failed run", async () => {
    const analyses = await api.listAnalyses();
    expect(analyses.length).toBeGreaterThan(0);
    expect(analyses.some((a) => a.status === "failed")).toBe(true);
  });

  it("throws not_found for an unknown analysis", async () => {
    await expect(api.getAnalysis("missing")).rejects.toMatchObject({ code: "not_found" });
  });

  it("filters findings by category and state", async () => {
    const duplicates = await api.listFindings({ analysisId: "an-1042", category: "duplicate" });
    expect(duplicates.length).toBeGreaterThan(0);
    expect(duplicates.every((f) => f.category === "duplicate")).toBe(true);

    const open = await api.listFindings({ analysisId: "an-1042", state: "open" });
    expect(open.every((f) => f.state === "open")).toBe(true);
  });

  it("attaches backend-authored evidence and audit entries to every finding", async () => {
    const findings = await api.listFindings({ analysisId: "an-1042" });
    for (const finding of findings) {
      expect(finding.evidence.length).toBeGreaterThan(0);
      expect(finding.audit.length).toBeGreaterThan(0);
      expect(finding.rationale).not.toBe("");
    }
  });

  it("moves a finding open -> assigned -> resolved and records audit history", async () => {
    const [first] = await api.listFindings({ analysisId: "an-1042", state: "open" });
    const assigned = await api.assignFinding(first!.id, "A. Controller");
    expect(assigned.state).toBe("assigned");
    expect(assigned.assignee).toBe("A. Controller");

    const resolved = await api.resolveFinding(first!.id, "Credit memo issued.");
    expect(resolved.state).toBe("resolved");
    expect(resolved.audit.at(-1)?.note).toBe("Credit memo issued.");
  });

  it("dismisses a finding with a retained reason", async () => {
    const [first] = await api.listFindings({ analysisId: "an-1042", state: "open" });
    const dismissed = await api.dismissFinding(first!.id, "Approved variance.");
    expect(dismissed.state).toBe("dismissed");
    expect(dismissed.audit.at(-1)?.action).toBe("Dismissed");
  });

  it("decreases the analysis open count when a finding is closed", async () => {
    const before = await api.getAnalysis("an-1042");
    const [first] = await api.listFindings({ analysisId: "an-1042", state: "open" });
    await api.resolveFinding(first!.id, "Handled.");
    const after = await api.getAnalysis("an-1042");
    expect(after.findingsOpen).toBe(before.findingsOpen - 1);
  });

  it("creates an analysis and reconciles it into ready findings", async () => {
    const created = await api.createAnalysis({
      name: "Test period",
      period: "2026-08",
      sourceKinds: ["csv_upload"],
      uploadedFileNames: ["ap_ledger.csv"],
    });
    expect(created.status).toBe("ingesting");
    expect(created.sources).toHaveLength(1);

    const reconciled = await api.reconcileAnalysis(created.id);
    expect(reconciled.status).toBe("ready");
    expect(reconciled.findingsTotal).toBeGreaterThan(0);
    expect(reconciled.amountAtRiskCents).toBeGreaterThan(0);
  });

  it("labels only QuickBooks Online and CSV upload as live", async () => {
    const integrations = await api.listIntegrations();
    const live = integrations.filter((i) => i.status === "live").map((i) => i.id);
    expect(live).toContain("quickbooks");
    expect(live).toContain("csv");
  });

  it("reports operational jobs including failures", async () => {
    const jobs = await api.listOperationalJobs();
    expect(jobs.some((job) => job.status === "failed")).toBe(true);
  });
});

describe("workflow transitions", () => {
  it("advances an analysis through the reconciliation lifecycle", () => {
    expect(nextAnalysisStatus("draft", "sources_attached")).toBe("ingesting");
    expect(nextAnalysisStatus("ingesting", "reconcile_started")).toBe("reconciling");
    expect(nextAnalysisStatus("reconciling", "reconcile_succeeded")).toBe("ready");
    expect(nextAnalysisStatus("reconciling", "reconcile_failed")).toBe("failed");
    expect(nextAnalysisStatus("failed", "reconcile_started")).toBe("reconciling");
  });

  it("does not skip ahead from draft", () => {
    expect(nextAnalysisStatus("draft", "reconcile_started")).toBe("draft");
  });

  it("maps status to the workflow step shown to the user", () => {
    expect(stepForStatus("draft")).toBe("connect");
    expect(stepForStatus("reconciling")).toBe("reconcile");
    expect(stepForStatus("ready")).toBe("review");
  });

  it("offers disposition actions only where they are valid", () => {
    expect(allowedFindingActions("open")).toEqual(["assign", "resolve", "dismiss"]);
    expect(allowedFindingActions("resolved")).toEqual(["reopen"]);
    expect(allowedFindingActions("dismissed")).toEqual(["reopen"]);
  });
});

describe("analytics scrubbing", () => {
  it("drops financial and document detail before it reaches a provider", () => {
    const safe = scrubPayload({
      workflowId: "an-1042",
      findingCount: 6,
      amountAtRiskCents: 7073300,
      vendor: "Northline Freight",
      invoiceReference: "INV-44821",
      documentName: "ap_ledger.csv",
      userEmail: "controller@demo-account.example",
    });
    expect(safe).toEqual({ workflowId: "an-1042", findingCount: 6 });
  });
});

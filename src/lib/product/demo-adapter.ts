/**
 * DEMO ADAPTER — SYNTHETIC DATA ONLY.
 *
 * Every record below is fabricated for demonstration. It is NOT customer data,
 * NOT proof of results, and never runs when VITE_API_BASE_URL is configured.
 * Reconciliation rationales here are illustrative strings authored for the demo;
 * the real matching rules live in the AP Exception Desk backend.
 */
import {
  ProductApiError,
  type AuditEntry,
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

export const DEMO_BANNER =
  "Demo mode — synthetic records. Not customer data and not a proof of results.";

const DEMO_USER: SessionUser = {
  id: "demo-user",
  email: "controller@demo-account.example",
  name: "Demo Controller",
  role: "controller",
  accountId: "demo-account",
  accountName: "Demo Manufacturing Co. (synthetic)",
};

const SESSION_KEY = "aped.demo.session";

function iso(daysAgo: number, hour = 9): string {
  const base = new Date("2026-08-19T00:00:00.000Z");
  base.setUTCDate(base.getUTCDate() - daysAgo);
  base.setUTCHours(hour, 0, 0, 0);
  return base.toISOString();
}

function seedFindings(analysisId: string): Finding[] {
  const rows: Array<Partial<Finding> & Pick<Finding, "category" | "vendor" | "reference" | "amountCents" | "severity" | "rationale">> = [
    {
      category: "duplicate",
      vendor: "Northline Freight",
      reference: "INV-44821",
      amountCents: 1284500,
      severity: "high",
      rationale: "Same vendor, amount and invoice number paid on two runs 11 days apart.",
    },
    {
      category: "duplicate",
      vendor: "Cascade Industrial Supply",
      reference: "84-99120",
      amountCents: 396000,
      severity: "medium",
      rationale: "Amount and date match an earlier invoice with a reformatted reference.",
    },
    {
      category: "missing_po",
      vendor: "Harbor Electrical",
      reference: "INV-7714",
      amountCents: 2210000,
      severity: "high",
      rationale: "Invoice exceeds the no-PO threshold with no purchase order on file.",
    },
    {
      category: "receipt_mismatch",
      vendor: "Cascade Industrial Supply",
      reference: "INV-51002",
      amountCents: 742300,
      severity: "medium",
      rationale: "Invoiced quantity is above the received quantity on the goods receipt.",
    },
    {
      category: "missing_statement_invoice",
      vendor: "Meridian Chemicals",
      reference: "STMT-2026-07",
      amountCents: 1560000,
      severity: "medium",
      rationale: "Vendor statement lists an invoice that is not present in the ledger.",
    },
    {
      category: "aged_approval",
      vendor: "Palmer Contracting",
      reference: "INV-3390",
      amountCents: 880000,
      severity: "low",
      rationale: "Invoice has been awaiting approval past the escalation window.",
    },
  ];

  return rows.map((row, index) => ({
    id: `${analysisId}-f${index + 1}`,
    analysisId,
    currency: "USD",
    detectedAt: iso(3, 10 + index),
    state: index === 5 ? "assigned" : "open",
    assignee: index === 5 ? "Demo Controller" : undefined,
    evidence: [
      {
        id: `${analysisId}-f${index + 1}-e1`,
        label: `${row.reference} (source document)`,
        kind: "invoice",
        sourceLabel: index % 2 === 0 ? "QuickBooks Online (synthetic)" : "CSV upload (synthetic)",
        capturedAt: iso(4),
      },
      {
        id: `${analysisId}-f${index + 1}-e2`,
        label: "Matching record used by the rule",
        kind: row.category === "receipt_mismatch" ? "receipt" : "payment",
        sourceLabel: "AP ledger export (synthetic)",
        capturedAt: iso(4),
      },
    ],
    audit: [
      {
        id: `${analysisId}-f${index + 1}-a1`,
        at: iso(3, 10 + index),
        actor: "Reconciliation engine",
        action: "Finding raised",
      },
    ],
    ...row,
  })) as Finding[];
}

export function createDemoProductApi(): ProductApi {
  let analyses: Analysis[] = [
    {
      id: "an-1042",
      name: "July close review",
      period: "2026-07",
      status: "ready",
      createdAt: iso(5),
      completedAt: iso(4),
      sources: [
        {
          id: "src-qbo",
          kind: "quickbooks",
          label: "QuickBooks Online",
          detail: "Synthetic sandbox company",
          connectedAt: iso(30),
        },
        {
          id: "src-csv",
          kind: "csv_upload",
          label: "CSV upload",
          detail: "ap_ledger_july.csv, vendor_statements_july.csv",
          connectedAt: iso(5),
        },
      ],
      documentsProcessed: 4182,
      findingsOpen: 5,
      findingsTotal: 6,
      amountAtRiskCents: 7073300,
    },
    {
      id: "an-1039",
      name: "Q2 duplicate sweep",
      period: "2026-Q2",
      status: "ready",
      createdAt: iso(28),
      completedAt: iso(27),
      sources: [
        {
          id: "src-csv-2",
          kind: "csv_upload",
          label: "CSV upload",
          detail: "ap_ledger_q2.csv",
          connectedAt: iso(28),
        },
      ],
      documentsProcessed: 11940,
      findingsOpen: 2,
      findingsTotal: 9,
      amountAtRiskCents: 4128000,
    },
    {
      id: "an-1031",
      name: "May statement match",
      period: "2026-05",
      status: "failed",
      createdAt: iso(60),
      sources: [
        {
          id: "src-csv-3",
          kind: "csv_upload",
          label: "CSV upload",
          detail: "statements_may.csv",
          connectedAt: iso(60),
        },
      ],
      documentsProcessed: 0,
      findingsOpen: 0,
      findingsTotal: 0,
      amountAtRiskCents: 0,
      failureReason: "Statement file column headers could not be mapped.",
    },
  ];

  const findings = new Map<string, Finding[]>([
    ["an-1042", seedFindings("an-1042")],
    ["an-1039", seedFindings("an-1039").slice(0, 4)],
  ]);

  const delay = (ms = 320) => new Promise((resolve) => setTimeout(resolve, ms));

  function readSession(): SessionUser | null {
    if (typeof localStorage === "undefined") return null;
    return localStorage.getItem(SESSION_KEY) ? DEMO_USER : null;
  }

  function mutate(id: string, apply: (finding: Finding) => Finding): Finding {
    for (const [analysisId, list] of findings) {
      const index = list.findIndex((f) => f.id === id);
      if (index >= 0) {
        const next = apply(list[index]!);
        const nextList = [...list];
        nextList[index] = next;
        findings.set(analysisId, nextList);
        analyses = analyses.map((a) =>
          a.id === analysisId
            ? { ...a, findingsOpen: nextList.filter((f) => f.state === "open").length }
            : a,
        );
        return next;
      }
    }
    throw new ProductApiError(`Finding ${id} not found`, "not_found");
  }

  function entry(actor: string, action: string, note?: string): AuditEntry {
    return {
      id: `aud-${Math.random().toString(36).slice(2, 9)}`,
      at: new Date().toISOString(),
      actor,
      action,
      ...(note ? { note } : {}),
    };
  }

  return {
    mode: "demo",

    async signIn(email) {
      await delay();
      if (!email.includes("@")) {
        throw new ProductApiError("Enter a valid work email.", "unauthorized");
      }
      if (typeof localStorage !== "undefined") localStorage.setItem(SESSION_KEY, "1");
      return DEMO_USER;
    },
    async signOut() {
      if (typeof localStorage !== "undefined") localStorage.removeItem(SESSION_KEY);
    },
    async getSession() {
      return readSession();
    },
    async requestAccess() {
      await delay();
    },

    async listAnalyses() {
      await delay();
      return analyses;
    },
    async getAnalysis(id) {
      await delay(200);
      const found = analyses.find((a) => a.id === id);
      if (!found) throw new ProductApiError(`Analysis ${id} not found`, "not_found");
      return found;
    },
    async createAnalysis(input: CreateAnalysisInput) {
      await delay();
      const id = `an-${1100 + analyses.length}`;
      const created: Analysis = {
        id,
        name: input.name,
        period: input.period,
        status: "ingesting",
        createdAt: new Date().toISOString(),
        sources: input.sourceKinds.map((kind, i) => ({
          id: `${id}-src-${i}`,
          kind,
          label: kind === "quickbooks" ? "QuickBooks Online" : "CSV upload",
          detail:
            kind === "quickbooks"
              ? "Synthetic sandbox company"
              : (input.uploadedFileNames ?? ["ap_ledger.csv"]).join(", "),
          connectedAt: new Date().toISOString(),
        })),
        documentsProcessed: 0,
        findingsOpen: 0,
        findingsTotal: 0,
        amountAtRiskCents: 0,
      };
      analyses = [created, ...analyses];
      return created;
    },
    async reconcileAnalysis(id) {
      await delay(700);
      const seeded = seedFindings(id);
      findings.set(id, seeded);
      let updated: Analysis | undefined;
      analyses = analyses.map((a) => {
        if (a.id !== id) return a;
        updated = {
          ...a,
          status: "ready",
          completedAt: new Date().toISOString(),
          documentsProcessed: 3560,
          findingsOpen: seeded.filter((f) => f.state === "open").length,
          findingsTotal: seeded.length,
          amountAtRiskCents: seeded.reduce((sum, f) => sum + f.amountCents, 0),
        };
        return updated;
      });
      if (!updated) throw new ProductApiError(`Analysis ${id} not found`, "not_found");
      return updated;
    },

    async listFindings(query: FindingQuery) {
      await delay(200);
      let list = findings.get(query.analysisId) ?? [];
      if (query.category) list = list.filter((f) => f.category === query.category);
      if (query.state) list = list.filter((f) => f.state === query.state);
      return list;
    },
    async getFinding(id) {
      await delay(160);
      for (const list of findings.values()) {
        const found = list.find((f) => f.id === id);
        if (found) return found;
      }
      throw new ProductApiError(`Finding ${id} not found`, "not_found");
    },
    async assignFinding(id, assignee) {
      await delay(200);
      return mutate(id, (f) => ({
        ...f,
        state: "assigned",
        assignee,
        audit: [...f.audit, entry(DEMO_USER.name, `Assigned to ${assignee}`)],
      }));
    },
    async resolveFinding(id, note) {
      await delay(200);
      return mutate(id, (f) => ({
        ...f,
        state: "resolved",
        audit: [...f.audit, entry(DEMO_USER.name, "Resolved", note)],
      }));
    },
    async dismissFinding(id, note) {
      await delay(200);
      return mutate(id, (f) => ({
        ...f,
        state: "dismissed",
        audit: [...f.audit, entry(DEMO_USER.name, "Dismissed", note)],
      }));
    },

    async listIntegrations(): Promise<Integration[]> {
      return [
        {
          id: "quickbooks",
          name: "QuickBooks Online",
          status: "live",
          summary:
            "Read-only sync of bills, payments, vendors and purchase orders through the existing backend connection path.",
        },
        {
          id: "csv",
          name: "CSV / spreadsheet upload",
          status: "live",
          summary:
            "AP ledger, purchase order, goods receipt and vendor statement files processed server-side.",
        },
      ];
    },
    async listPricingPlans(): Promise<PricingPlan[]> {
      return [
        {
          id: "pilot",
          name: "Pilot Analysis",
          audience: "First engagement, one period of AP history",
          priceLabel: "Scoped per engagement",
          billingNote: "Fixed-scope pilot. Pricing confirmed in writing before work starts.",
          features: [
            "One reconciliation period",
            "All five exception categories",
            "Evidence-linked findings and audit history",
            "Written exception summary for your controller",
          ],
          ctaLabel: "Request a Pilot Analysis",
          highlighted: true,
        },
        {
          id: "desk",
          name: "Exception Desk",
          audience: "Ongoing monthly close control",
          priceLabel: "Configurable subscription",
          billingNote: "Priced on AP volume and entity count. No published list price.",
          features: [
            "Recurring analyses each close",
            "Assignment, resolution and dismissal workflow",
            "Retained audit history",
            "QuickBooks Online sync",
          ],
          ctaLabel: "Discuss the Exception Desk",
        },
        {
          id: "partner",
          name: "Finance partner",
          audience: "Outsourced finance teams with multiple clients",
          priceLabel: "Configurable per account",
          billingNote: "Per-client accounts with separated data and access.",
          features: [
            "Multiple client accounts",
            "Per-account access control",
            "Consolidated exception reporting",
          ],
          ctaLabel: "Talk about partner accounts",
        },
      ];
    },
    async listOperationalJobs(): Promise<OperationalJob[]> {
      await delay(200);
      return [
        {
          id: "job-9912",
          analysisId: "an-1042",
          kind: "reconcile",
          status: "succeeded",
          startedAt: iso(4, 8),
          durationMs: 184000,
        },
        {
          id: "job-9908",
          analysisId: "an-1042",
          kind: "quickbooks_sync",
          status: "succeeded",
          startedAt: iso(4, 7),
          durationMs: 61000,
        },
        {
          id: "job-9871",
          analysisId: "an-1031",
          kind: "file_ingest",
          status: "failed",
          startedAt: iso(60, 12),
          durationMs: 4200,
          error: "Statement file column headers could not be mapped.",
        },
      ];
    },
  };
}
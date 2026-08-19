import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppShell } from "@/components/product/app-shell";
import { ErrorState } from "@/components/product/states";
import { IntegrationStatusBadge } from "@/components/product/status-badge";
import { analytics } from "@/lib/analytics";
import { can, isSecureLinkMode, productApi, type DataSource } from "@/lib/product";
import {
  UPLOAD_KINDS,
  UPLOAD_KIND_LABELS,
  type UploadKind,
} from "@/lib/product/backend-dto";
import { SecureWorkspaceAction, UnavailableHere } from "@/components/product/handoff";

export const Route = createFileRoute("/app/new")({
  component: NewAnalysis,
});

function NewAnalysis() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [period, setPeriod] = useState("");
  const [kinds, setKinds] = useState<Array<DataSource["kind"]>>(["quickbooks"]);
  const [uploads, setUploads] = useState<Array<{ file: File; kind: UploadKind }>>([]);

  const create = useMutation({
    mutationFn: async () => {
      const analysis = await productApi.createAnalysis({
        name,
        period,
        sourceKinds: kinds,
        uploadedFileNames: uploads.map((upload) => upload.file.name),
      });
      // The backend accepts exactly one file plus its kind per request, so each
      // selected file is uploaded sequentially and the analysis is re-read after.
      if (uploads.length > 0 && can("upload_files") && productApi.uploadAnalysisFiles) {
        return productApi.uploadAnalysisFiles(analysis.id, uploads);
      }
      return analysis;
    },
    onSuccess: async (analysis) => {
      analytics.track("core_workflow_started", {
        workflowId: analysis.id,
        sourceCount: kinds.length,
      });
      await navigate({ to: "/app/analyses/$analysisId", params: { analysisId: analysis.id } });
    },
  });

  function toggle(kind: DataSource["kind"]) {
    setKinds((current) =>
      current.includes(kind) ? current.filter((k) => k !== kind) : [...current, kind],
    );
  }

  return (
    <AppShell
      title="New analysis"
      description="Name the period, attach the records, then hand it to the reconciliation engine. Matching rules run on the backend."
    >
      {!can("create_analysis") ? (
        <div className="max-w-2xl">
          <UnavailableHere
            title="New analyses are created in the secure workspace"
            action={<SecureWorkspaceAction path="/pilots/new" label="Open secure workspace" />}
          >
            {isSecureLinkMode
              ? "Connecting QuickBooks Online and uploading AP records happens in the preserved AP Exception Desk workspace, which owns file processing, evidence storage and audit events."
              : "This environment cannot create real analyses. Configure the secure workspace URL to hand off, or the API gateway to enable it here."}
          </UnavailableHere>
        </div>
      ) : (
      <form
        className="max-w-2xl space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          create.mutate();
        }}
      >
        <fieldset className="border border-border bg-surface-raised p-5">
          <legend className="eyebrow px-1">1. Scope</legend>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Analysis name</Label>
              <Input
                id="name"
                required
                placeholder="Q3 payables review"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="period">Period</Label>
              <Input
                id="period"
                required
                placeholder="2026-07 to 2026-09"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              />
            </div>
          </div>
        </fieldset>

        <fieldset className="border border-border bg-surface-raised p-5">
          <legend className="eyebrow px-1">2. Data sources</legend>
          <div className="mt-3 space-y-3">
            <label className="flex items-start gap-3 text-sm">
              <Checkbox
                checked={kinds.includes("quickbooks")}
                onCheckedChange={() => toggle("quickbooks")}
                aria-label="QuickBooks Online"
              />
              <span>
                <span className="flex items-center gap-2 font-medium">
                  QuickBooks Online <IntegrationStatusBadge status="live" />
                </span>
                <span className="mt-0.5 block text-muted-foreground">
                  Read-only sync of bills, payments, vendors and purchase orders through the existing
                  backend connection.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-3 text-sm">
              <Checkbox
                checked={kinds.includes("csv_upload")}
                onCheckedChange={() => toggle("csv_upload")}
                aria-label="CSV upload"
              />
              <span>
                <span className="flex items-center gap-2 font-medium">
                  CSV / export upload <IntegrationStatusBadge status="live" />
                </span>
                <span className="mt-0.5 block text-muted-foreground">
                  AP register, PO list, receipts and vendor statements.
                </span>
              </span>
            </label>

            {kinds.includes("csv_upload") ? (
              <div className="space-y-1.5 border-t border-border pt-3">
                <Label htmlFor="files">Files</Label>
                <Input
                  id="files"
                  type="file"
                  multiple
                  accept=".csv,.xlsx,.pdf"
                  onChange={(e) =>
                    setUploads(
                      Array.from(e.target.files ?? []).map((file) => ({
                        file,
                        kind: "invoice_export" as UploadKind,
                      })),
                    )
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Each file is uploaded with its record type so the backend parses it correctly.
                  Contents never reach analytics.
                </p>
                {uploads.length > 0 ? (
                  <ul className="mt-2 space-y-2 text-xs">
                    {uploads.map((upload, index) => (
                      <li key={upload.file.name} className="flex flex-wrap items-center gap-2">
                        <span className="num text-muted-foreground">{upload.file.name}</span>
                        <label className="ml-auto flex items-center gap-1.5">
                          <span className="text-muted-foreground">Record type</span>
                          <select
                            aria-label={`Record type for ${upload.file.name}`}
                            className="border border-input bg-background px-2 py-1 text-xs"
                            value={upload.kind}
                            onChange={(event) =>
                              setUploads((current) =>
                                current.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? { ...item, kind: event.target.value as UploadKind }
                                    : item,
                                ),
                              )
                            }
                          >
                            {UPLOAD_KINDS.map((kind) => (
                              <option key={kind} value={kind}>
                                {UPLOAD_KIND_LABELS[kind]}
                              </option>
                            ))}
                          </select>
                        </label>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </div>
        </fieldset>

        {create.error ? (
          <ErrorState
            title="Analysis could not be created"
            message={(create.error as Error).message}
          />
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={create.isPending || kinds.length === 0}>
            {create.isPending ? "Creating…" : "Create analysis"}
          </Button>
          <Button type="button" variant="outline" onClick={() => void navigate({ to: "/app" })}>
            Cancel
          </Button>
        </div>
      </form>
      )}
    </AppShell>
  );
}
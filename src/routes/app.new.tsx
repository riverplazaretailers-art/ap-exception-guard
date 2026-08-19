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
import { productApi, type DataSource } from "@/lib/product";

export const Route = createFileRoute("/app/new")({
  component: NewAnalysis,
});

function NewAnalysis() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [period, setPeriod] = useState("");
  const [kinds, setKinds] = useState<Array<DataSource["kind"]>>(["quickbooks"]);
  const [files, setFiles] = useState<string[]>([]);

  const create = useMutation({
    mutationFn: () =>
      productApi.createAnalysis({
        name,
        period,
        sourceKinds: kinds,
        uploadedFileNames: files,
      }),
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
                    setFiles(Array.from(e.target.files ?? []).map((file) => file.name))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Files are processed by the backend; contents never reach analytics.
                </p>
                {files.length > 0 ? (
                  <ul className="num mt-2 space-y-1 text-xs text-muted-foreground">
                    {files.map((file) => (
                      <li key={file}>{file}</li>
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
    </AppShell>
  );
}
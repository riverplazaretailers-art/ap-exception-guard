import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/product/app-shell";
import { useSession } from "@/components/product/session";
import { IntegrationStatusBadge } from "@/components/product/status-badge";
import { ErrorState, LoadingState } from "@/components/product/states";
import { productApi, productConfig, productMode } from "@/lib/product";
import { SecureWorkspaceAction } from "@/components/product/handoff";

export const Route = createFileRoute("/app/settings")({
  component: SettingsPage,
});

const ROLE_LABELS: Record<string, string> = {
  controller: "Controller",
  ap_manager: "AP manager",
  finance_partner: "Finance partner",
  operator: "Operator",
};

function SettingsPage() {
  const { user } = useSession();
  const integrations = useQuery({
    queryKey: ["integrations"],
    queryFn: () => productApi.listIntegrations(),
  });

  return (
    <AppShell
      title="Settings"
      description="Account details and the data connections available to this product. Credentials and matching thresholds are held by the backend."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="border border-border bg-surface-raised p-5">
          <p className="eyebrow">Account</p>
          <dl className="mt-3 divide-y divide-border text-sm">
            <Row label="Organization" value={user?.accountName ?? "—"} />
            <Row label="Signed in as" value={user?.name ?? "—"} />
            <Row label="Email" value={user?.email ?? "—"} />
            <Row label="Role" value={user ? (ROLE_LABELS[user.role] ?? user.role) : "—"} />
          </dl>
          <p className="mt-4 text-xs text-muted-foreground">
            Roles and permissions are managed by your account administrator in the backend
            directory — this screen reflects them, it does not change them.
          </p>
        </section>

        <section className="border border-border bg-surface-raised p-5">
          <p className="eyebrow">Data connections</p>
          <div className="mt-3">
            {integrations.isLoading ? <LoadingState label="Loading connections" /> : null}
            {integrations.error ? (
              <ErrorState
                title="Could not load connections"
                message={(integrations.error as Error).message}
                onRetry={() => void integrations.refetch()}
              />
            ) : null}
            <ul className="divide-y divide-border text-sm">
              {(integrations.data ?? []).map((integration) => (
                <li key={integration.id} className="py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{integration.name}</span>
                    <IntegrationStatusBadge status={integration.status} />
                  </div>
                  <p className="mt-1 text-muted-foreground">{integration.summary}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border border-border bg-surface-raised p-5 lg:col-span-2">
          <p className="eyebrow">Connection mode</p>
          <dl className="mt-3 divide-y divide-border text-sm">
            <Row label="Mode" value={MODE_LABELS[productMode] ?? productMode} />
            <Row
              label="Backend gateway"
              value={
                productConfig.apiBaseUrl
                  ? `Configured (contract ${productConfig.contractVersion})`
                  : "Not connected"
              }
            />
            <Row
              label="Secure workspace"
              value={productConfig.secureWorkspaceUrl ?? "Not configured"}
            />
          </dl>
          {productConfig.warnings.length > 0 ? (
            <ul className="mt-3 space-y-1 border-l-2 border-destructive pl-3 text-xs text-muted-foreground">
              {productConfig.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}
          {productMode === "api" ? (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
              <li>
                The v1 contract records a finding as open or resolved with an assignee. Dismissal,
                resolution notes and per-finding audit history are not exposed here.
              </li>
              <li>
                Reconciliation runs are triggered by the preserved service, not from this shell.
              </li>
              <li>Sign-in and access requests stay with the secure workspace.</li>
            </ul>
          ) : null}
          <p className="mt-3 text-xs text-muted-foreground">
            This shell is not directly connected to the AP Exception Desk backend. Reconciliation,
            QuickBooks OAuth, file processing, evidence and audit events stay with the preserved
            service and its own secure sign-in.
          </p>
          <div className="mt-4">
            <SecureWorkspaceAction path="/sign-in" label="Open secure workspace" variant="outline" size="sm" />
          </div>
        </section>
      </div>
    </AppShell>
  );
}

const MODE_LABELS: Record<string, string> = {
  demo: "Demo — synthetic records only",
  "secure-link": "Secure link — real work handed off to the preserved workspace",
  api: "API gateway — v1 contract",
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
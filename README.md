# AP Exception Desk — A TwoRiverOps solution

Customer-facing application for controllers, AP managers and outsourced finance teams:
catch payables exceptions before they become duplicate payments, unsupported spend or
month-end fire drills.

## Architecture

This project is an independent product frontend. It owns presentation only. Reconciliation
and matching rules, QuickBooks Online OAuth/sync, file processing, evidence storage,
workflow state, auth and audit events remain with the preserved AP Exception Desk backend
(D1 / R2). No accounting decision is reproduced in a React component.

**This shell is not directly connected to the preserved backend yet.** Authentication lives
in the backend's own secure workspace, so real work is either demonstrated with synthetic
records or handed off. Modes are explicit and fail closed.

```text
routes / components        presentation only
        |
        v
ProductApi  (src/lib/product/types.ts)      typed boundary
        |-- api-adapter.ts    preserved backend routes, gated by mode "api"
        `-- demo-adapter.ts   SYNTHETIC records, clearly labeled, no network

mode + capabilities  (src/lib/product/config.ts)
```

## Modes

| Mode | Trigger | Behaviour |
| --- | --- | --- |
| `demo` | default (nothing configured) | Visibly synthetic records, no network calls, every screen reviewable. |
| `secure-link` | `VITE_SECURE_WORKSPACE_URL` set | Sign-in, request-access, connect and upload CTAs open the preserved secure workspace. Authenticated data capabilities are **off**: `/app` and all protected data routes hand off instead of showing synthetic records as customer data. |
| `api` | `VITE_API_BASE_URL` **and** `VITE_API_CONTRACT_VERSION=v1` | Typed gateway against the routes below. |

Fail-closed rules (`resolveProductConfig`):

- One of the two API variables missing, or a contract version other than `v1`, keeps API
  mode **off** and records a warning shown in Settings. No speculative contract is called.
- URLs must be absolute `https` (plain `http` only for `localhost`), with no embedded
  credentials, query string or fragment. Unsafe values are ignored with a warning.
- Capabilities are typed (`src/lib/product/config.ts`). Actions the current mode cannot
  perform are hidden or replaced with a secure-workspace handoff — never left to fail.

## API integration (authoritative v1 contract)

The `api` adapter calls only the routes the preserved backend exposes, with credentialed
session cookies. Backend DTOs (snake_case, dollar amounts) are declared in
`src/lib/product/backend-dto.ts` and converted by pure mapping functions — no accounting
decision is made in React.

| ProductApi method | Request | Response envelope |
| --- | --- | --- |
| `listAnalyses` | `GET /api/pilots` | `{ pilots: PilotRow[] }` |
| `createAnalysis` | `POST /api/pilots` with exactly `{ company }` | `{ pilot }` |
| `getAnalysis` / `listFindings` / `getFinding` | `GET /api/pilots/:id` | `{ pilot, files, records, connections, findings }` |
| `uploadAnalysisFiles` | `POST /api/pilots/:id/files`, multipart, **one `file` + one `kind` per request**, sent sequentially, then the analysis is re-read | `{ file, recordsCreated, findingsCreated }` |
| `assignFinding` | `PATCH /api/findings/:id` `{ status: "open", assigned_to }` | `{ ok, status, assigned_to }` |
| `resolveFinding` | `PATCH /api/findings/:id` `{ status: "resolved", assigned_to: <current or ""> }`, then re-read the pilot | `{ ok, status, assigned_to }` |
| `getQuickBooksStatus` | `GET /api/integrations/quickbooks/status?pilotId=` | `{ configured, connection }` |
| `getQuickBooksStartUrl` | `GET /api/integrations/quickbooks/start?pilotId=` | backend-owned OAuth redirect |
| `syncQuickBooks` | `POST /api/integrations/quickbooks/sync` `{ pilotId }`, then refetch pilot + QBO status | `{ records, findings }` |

Accepted upload kinds: `invoice_export`, `purchase_orders`, `receipts`, `vendor_statement`,
`supporting_pdf`. The multipart field names are exactly `file` and `kind`; a `files` field
is never sent.

Mapping rules (`backend-dto.ts`):

- Finding types are mapped explicitly — `Possible duplicate` → `duplicate`;
  `Missing purchase order` / `Purchase order not found` / `PO amount mismatch` →
  `missing_po`; `Receipt not found` / `Receipt mismatch` → `receipt_mismatch`;
  `Statement invoice missing` → `missing_statement_invoice`; `Aged approval` →
  `aged_approval`. Unknown types, statuses or severities are reported as unmapped rather
  than guessed.
- `amount` (dollars) → `amountCents` via `Math.round(amount * 100)`; `High`/`Medium`/`Low`
  → lowercase severity; `summary` → `rationale`, `question` → `question`, `evidence` →
  `evidenceNote` (text only — no document URL is invented).
- QuickBooks is `connected` only when `connection.status === "connected"`; `realm_id` →
  `realmLabel`, `updated_at` → `lastSyncAt`, and `configured: false` produces an explicit
  configuration message.

### Auth and gateway constraint

These routes sit behind the backend's own secure sign-in workspace. This shell has no
session surface of its own: it sends `credentials: "include"` and depends on an existing
backend session, so **api mode is a typed future gateway, not a claimed live
integration**. Sign-in, sign-out, session, access requests, reconcile triggers, pricing
plans and operational job history are rejected with `ProductApiError("unsupported")`.

### Backend limits surfaced in the UI

The v1 contract cannot persist a resolution note, an `assigned` state, or a `dismissed`
state, and exposes no per-finding document URLs or audit trail. In `api` mode the
matching capabilities (`finding_dismiss`, `resolution_notes`, `finding_audit_history`,
`evidence_documents`) are **false**, so those controls are hidden and the screens say where
the record actually lives.

Errors map to `ProductApiError` codes (`unauthorized`, `forbidden`, `not_found`, `server`,
`network`, `unsupported`, `not_configured`) which drive the loading / empty / error /
permission-denied states.

## Integration status

- QuickBooks Online — **Live** in the preserved backend connection path only. Not claimed
  as live from this shell.
- CSV / export upload — **Live** in the preserved backend.

No other integration is claimed.

Provider-neutral interfaces:

- `src/lib/analytics.ts` — value events only (`account_created`, `onboarding_completed`,
  `core_workflow_started`, `first_successful_outcome`, `core_workflow_completed`,
  `workflow_failed`, `repeat_usage`, `converted_to_paid`, `subscription_cancelled`).
  Payloads are scrubbed: no document contents, invoice line items, vendor names, amounts
  or personal data leave the app.
- `src/lib/billing.ts` — product, plan, account, MRR, usage, trial and payment state. No
  payment vendor SDK is referenced by workflow code.

## Environment

Copy `.env.example` to `.env.local`. No secrets are stored in source.

## Commands

```sh
bun install
bun run dev
bunx vitest run   # adapter + workflow transition tests
```

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Open your project in the [Lovable editor](https://lovable.dev) and keep building.

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: connect the project to GitHub and every change made in Lovable is committed straight to your repository.
- **Full ownership**: this code is yours. Push to your repository and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS

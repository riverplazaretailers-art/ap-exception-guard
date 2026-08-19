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
| `secure-link` | `VITE_SECURE_WORKSPACE_URL` set | Sign-in, request-access, connect and upload CTAs for real work open the preserved secure workspace. Displayed records stay synthetic and are labeled as a preview. |
| `api` | `VITE_API_BASE_URL` **and** `VITE_API_CONTRACT_VERSION=v1` | Typed gateway against the routes below. |

Fail-closed rules (`resolveProductConfig`):

- One of the two API variables missing, or a contract version other than `v1`, keeps API
  mode **off** and records a warning shown in Settings. No speculative contract is called.
- URLs must be absolute `https` (plain `http` only for `localhost`), with no embedded
  credentials, query string or fragment. Unsafe values are ignored with a warning.
- Capabilities are typed (`src/lib/product/config.ts`). Actions the current mode cannot
  perform are hidden or replaced with a secure-workspace handoff — never left to fail.

## API integration (existing backend routes)

The `api` adapter calls only routes the preserved backend actually exposes, with
credentialed session cookies:

| ProductApi method | Request |
| --- | --- |
| `listAnalyses` | `GET /api/pilots` |
| `createAnalysis` | `POST /api/pilots` |
| `getAnalysis` / `listFindings` | `GET /api/pilots/:id` (findings filtered client-side for display only) |
| `uploadAnalysisFiles` | `POST /api/pilots/:id/files` (multipart) |
| `assignFinding` / `resolveFinding` / `dismissFinding` | `PATCH /api/findings/:id` |
| `getQuickBooksStatus` | `GET /api/integrations/quickbooks/status?pilotId=` |
| `getQuickBooksStartUrl` | `GET /api/integrations/quickbooks/start?pilotId=` |
| `syncQuickBooks` | `POST /api/integrations/quickbooks/sync` |

Not exposed by the backend contract, and therefore rejected with
`ProductApiError("unsupported")` rather than guessed: sign-in/sign-out/session,
access requests, reconcile triggers, single-finding fetch, pricing plans and operational
job history. Authentication remains the secure workspace's responsibility.

Errors map to `ProductApiError` codes (`unauthorized`, `forbidden`, `not_found`, `server`,
`network`, `unsupported`, `not_configured`) which drive the loading / empty / error /
permission-denied states.

Evidence is opened through short-lived backend-signed URLs; document bodies never pass
through this frontend.

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

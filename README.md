# AP Exception Desk — A TwoRiverOps solution

Customer-facing application for controllers, AP managers and outsourced finance teams:
catch payables exceptions before they become duplicate payments, unsupported spend or
month-end fire drills.

## Architecture

This project is an independent product frontend. It owns presentation only. Reconciliation
and matching rules, QuickBooks Online OAuth/sync, file processing, evidence storage,
workflow state, auth and audit events remain with the existing AP Exception Desk backend
(D1 / R2). No accounting decision is reproduced in a React component.

```text
routes / components        presentation only
        |
        v
ProductApi  (src/lib/product/types.ts)      typed boundary
        |-- http-adapter.ts   authoritative backend, VITE_API_BASE_URL
        `-- demo-adapter.ts   SYNTHETIC records, clearly labeled, no backend
```

Adapter selection lives in `src/lib/product/index.ts`: with `VITE_API_BASE_URL` set the
HTTP adapter is used; without it the demo adapter runs and a demo banner is shown.

Provider-neutral interfaces:

- `src/lib/analytics.ts` — value events only (`account_created`, `onboarding_completed`,
  `core_workflow_started`, `first_successful_outcome`, `core_workflow_completed`,
  `workflow_failed`, `repeat_usage`, `converted_to_paid`, `subscription_cancelled`).
  Payloads are scrubbed: no document contents, invoice line items, vendor names, amounts
  or personal data leave the app.
- `src/lib/billing.ts` — product, plan, account, MRR, usage, trial and payment state. No
  payment vendor SDK is referenced by workflow code.

## API integration

The HTTP adapter expects a JSON API with credentialed session cookies:

| ProductApi method | Request |
| --- | --- |
| `signIn` / `signOut` / `getSession` | `POST /auth/sign-in`, `POST /auth/sign-out`, `GET /auth/session` |
| `requestAccess` | `POST /access-requests` |
| `listAnalyses` / `getAnalysis` / `createAnalysis` | `GET /analyses`, `GET /analyses/:id`, `POST /analyses` |
| `reconcileAnalysis` | `POST /analyses/:id/reconcile` |
| `listFindings` / `getFinding` | `GET /findings?analysisId=&category=&state=`, `GET /findings/:id` |
| `assignFinding` / `resolveFinding` / `dismissFinding` | `POST /findings/:id/assign|resolve|dismiss` |
| `listIntegrations` / `listPricingPlans` / `listOperationalJobs` | `GET /integrations`, `GET /pricing-plans`, `GET /ops/jobs` |

Errors map to `ProductApiError` codes (`unauthorized`, `forbidden`, `not_found`, `server`,
`network`) which drive the loading / empty / error / permission-denied states.

Evidence is opened through short-lived backend-signed URLs; document bodies never pass
through this frontend.

## Integration status

- QuickBooks Online — **Live** (existing backend read-only connection path)
- CSV / export upload — **Live**

No other integration is claimed.

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

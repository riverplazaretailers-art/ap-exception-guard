/**
 * Provider-neutral analytics. No document contents, invoice line items, vendor
 * financial detail or personal data may be sent — identifiers and counts only.
 */
export type AnalyticsEventName =
  | "account_created"
  | "onboarding_completed"
  | "core_workflow_started"
  | "first_successful_outcome"
  | "core_workflow_completed"
  | "workflow_failed"
  | "repeat_usage"
  | "converted_to_paid"
  | "subscription_cancelled";

export interface AnalyticsContext {
  product: "ap-exception-desk";
  accountId?: string;
  userId?: string;
  workflowId?: string;
  outcomeId?: string;
}

export type AnalyticsProperties = Record<string, string | number | boolean>;

export interface AnalyticsProvider {
  readonly name: string;
  track(event: AnalyticsEventName, payload: AnalyticsContext & AnalyticsProperties): void;
}

/** Keys that must never reach an analytics provider. */
const FORBIDDEN = [
  "amount",
  "cents",
  "total",
  "vendor",
  "invoice",
  "reference",
  "document",
  "filename",
  "email",
  "name",
  "note",
  "rationale",
];

export function scrubPayload<T extends Record<string, unknown>>(payload: T): AnalyticsProperties {
  const safe: AnalyticsProperties = {};
  for (const [key, value] of Object.entries(payload)) {
    const lowered = key.toLowerCase();
    if (FORBIDDEN.some((bad) => lowered.includes(bad))) continue;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      safe[key] = value;
    }
  }
  return safe;
}

export const consoleAnalyticsProvider: AnalyticsProvider = {
  name: "console",
  track(event, payload) {
    if (import.meta.env.DEV) console.info(`[analytics] ${event}`, payload);
  },
};

export interface Analytics {
  identifyAccount(context: Pick<AnalyticsContext, "accountId" | "userId">): void;
  track(event: AnalyticsEventName, properties?: Record<string, unknown>): void;
}

function scrubIdentity(next: Pick<AnalyticsContext, "accountId" | "userId">) {
  return {
    ...(next.accountId ? { accountId: next.accountId } : {}),
    ...(next.userId ? { userId: next.userId } : {}),
  };
}

export function createAnalytics(provider: AnalyticsProvider = consoleAnalyticsProvider): Analytics {
  let context: AnalyticsContext = { product: "ap-exception-desk" };
  const seen = new Set<AnalyticsEventName>();

  return {
    identifyAccount(next) {
      context = { ...context, ...scrubIdentity(next) };
    },
    track(event, properties = {}) {
      provider.track(event, {
        ...context,
        ...scrubPayload(properties),
        first_time_for_session: !seen.has(event),
      });
      seen.add(event);
    },
  };
}

export const analytics = createAnalytics();
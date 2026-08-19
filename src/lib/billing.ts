/**
 * Provider-neutral billing model. Workflow code never references Stripe,
 * Paddle or any vendor SDK — a provider implementation sits behind this shape.
 */
export type SubscriptionState = "trialing" | "active" | "past_due" | "cancelled" | "not_started";

export type PaymentState = "none" | "ok" | "action_required" | "failed";

export interface BillingAccount {
  accountId: string;
  accountName: string;
  productId: "ap-exception-desk";
  planId: string;
  planName: string;
  subscriptionState: SubscriptionState;
  paymentState: PaymentState;
  trialEndsAt?: string;
  mrrCents: number;
  currency: string;
  usage: {
    periodLabel: string;
    analysesRun: number;
    analysesIncluded: number;
    documentsProcessed: number;
  };
}

export interface BillingProvider {
  readonly name: string;
  getAccount(): Promise<BillingAccount>;
  requestPlanChange(planId: string): Promise<void>;
  cancelSubscription(reason: string): Promise<void>;
}

/** DEMO billing provider — synthetic state, no payment provider involved. */
export function createDemoBillingProvider(): BillingProvider {
  let account: BillingAccount = {
    accountId: "demo-account",
    accountName: "Demo Manufacturing Co. (synthetic)",
    productId: "ap-exception-desk",
    planId: "pilot",
    planName: "Pilot Analysis",
    subscriptionState: "trialing",
    paymentState: "none",
    trialEndsAt: "2026-09-15T00:00:00.000Z",
    mrrCents: 0,
    currency: "USD",
    usage: {
      periodLabel: "August 2026",
      analysesRun: 3,
      analysesIncluded: 4,
      documentsProcessed: 16122,
    },
  };

  return {
    name: "demo",
    async getAccount() {
      return account;
    },
    async requestPlanChange(planId) {
      account = { ...account, planId };
    },
    async cancelSubscription() {
      account = { ...account, subscriptionState: "cancelled", mrrCents: 0 };
    },
  };
}

export const billing: BillingProvider = createDemoBillingProvider();
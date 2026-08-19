import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AppShell, MetricTile } from "@/components/product/app-shell";
import { ErrorState, LoadingState, SuccessNote } from "@/components/product/states";
import { analytics } from "@/lib/analytics";
import { billing } from "@/lib/billing";
import { count, day, usd } from "@/lib/format";
import { productApi } from "@/lib/product";

export const Route = createFileRoute("/app/billing")({
  component: BillingPage,
});

const SUBSCRIPTION_LABELS: Record<string, string> = {
  trialing: "Pilot / trial",
  active: "Active",
  past_due: "Past due",
  cancelled: "Cancelled",
  not_started: "Not started",
};

const PAYMENT_LABELS: Record<string, string> = {
  none: "No payment method on file",
  ok: "Payment method valid",
  action_required: "Action required",
  failed: "Last payment failed",
};

function BillingPage() {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const account = useQuery({ queryKey: ["billing"], queryFn: () => billing.getAccount() });
  const plans = useQuery({ queryKey: ["plans"], queryFn: () => productApi.listPricingPlans() });

  const changePlan = useMutation({
    mutationFn: (planId: string) => billing.requestPlanChange(planId),
    onSuccess: async (_result, planId) => {
      analytics.track("converted_to_paid", { planId });
      setNotice("Plan change requested. We confirm scope and price in writing before billing.");
      await queryClient.invalidateQueries({ queryKey: ["billing"] });
    },
  });

  const cancel = useMutation({
    mutationFn: () => billing.cancelSubscription(reason),
    onSuccess: async () => {
      analytics.track("subscription_cancelled", { hasReason: reason.length > 0 });
      setNotice("Cancellation recorded. Your analyses and audit history stay available for export.");
      setReason("");
      await queryClient.invalidateQueries({ queryKey: ["billing"] });
    },
  });

  return (
    <AppShell
      title="Account & billing"
      description="Plan, usage and payment state. Billing runs through a provider-neutral interface, so the workflow never depends on a payment vendor."
    >
      {account.isLoading ? <LoadingState label="Loading billing" /> : null}
      {account.error ? (
        <ErrorState
          title="Could not load billing"
          message={(account.error as Error).message}
          onRetry={() => void account.refetch()}
        />
      ) : null}

      {account.data ? (
        <div className="space-y-6">
          {notice ? <SuccessNote>{notice}</SuccessNote> : null}

          <div className="grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
            <MetricTile label="Plan" value={account.data.planName} />
            <MetricTile
              label="Subscription"
              value={SUBSCRIPTION_LABELS[account.data.subscriptionState] ?? account.data.subscriptionState}
              note={
                account.data.trialEndsAt ? `Pilot period ends ${day(account.data.trialEndsAt)}` : undefined
              }
            />
            <MetricTile
              label="Recurring revenue"
              value={usd(account.data.mrrCents, account.data.currency)}
              note={PAYMENT_LABELS[account.data.paymentState]}
            />
            <MetricTile
              label="Usage"
              value={`${count(account.data.usage.analysesRun)} / ${count(account.data.usage.analysesIncluded)}`}
              note={`Analyses in ${account.data.usage.periodLabel}`}
            />
          </div>

          <section>
            <p className="eyebrow">Plans</p>
            {plans.isLoading ? <LoadingState label="Loading plans" /> : null}
            <div className="mt-3 grid gap-4 md:grid-cols-3">
              {(plans.data ?? []).map((plan) => (
                <div key={plan.id} className="flex flex-col border border-border bg-surface-raised p-5">
                  <p className="text-sm font-semibold">{plan.name}</p>
                  <p className="num mt-1 text-lg">{plan.priceLabel}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{plan.billingNote}</p>
                  <ul className="mt-3 flex-1 space-y-1.5 text-sm text-muted-foreground">
                    {plan.features.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                  <Button
                    className="mt-4"
                    variant={plan.id === account.data.planId ? "outline" : "default"}
                    disabled={plan.id === account.data.planId || changePlan.isPending}
                    onClick={() => changePlan.mutate(plan.id)}
                  >
                    {plan.id === account.data.planId ? "Current plan" : plan.ctaLabel}
                  </Button>
                </div>
              ))}
            </div>
          </section>

          <section className="border border-border bg-surface-raised p-5">
            <p className="eyebrow">Cancel</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Cancelling stops future billing. Findings, evidence links and audit history remain
              available for export under the retention policy.
            </p>
            <Textarea
              className="mt-3 max-w-xl"
              rows={3}
              placeholder="Reason (optional, kept for account records)"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              aria-label="Cancellation reason"
            />
            {cancel.error ? (
              <ErrorState title="Cancellation failed" message={(cancel.error as Error).message} />
            ) : null}
            <Button
              variant="outline"
              className="mt-3"
              disabled={cancel.isPending || account.data.subscriptionState === "cancelled"}
              onClick={() => cancel.mutate()}
            >
              {account.data.subscriptionState === "cancelled"
                ? "Subscription cancelled"
                : "Cancel subscription"}
            </Button>
          </section>
        </div>
      ) : null}
    </AppShell>
  );
}
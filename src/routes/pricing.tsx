import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketingShell, PageHeader } from "@/components/product/marketing-shell";
import { ErrorState, LoadingState } from "@/components/product/states";
import { productApi } from "@/lib/product";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — AP Exception Desk" },
      {
        name: "description",
        content:
          "Start with a fixed-scope Pilot Analysis. Ongoing Exception Desk and finance partner pricing is configured to AP volume and confirmed in writing.",
      },
      { property: "og:title", content: "AP Exception Desk pricing" },
      {
        property: "og:description",
        content: "Fixed-scope pilot, then configurable subscription pricing. No invented list price.",
      },
    ],
  }),
  component: PricingPage,
});

function PricingPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["pricing-plans"],
    queryFn: () => productApi.listPricingPlans(),
  });

  return (
    <MarketingShell>
      <PageHeader
        eyebrow="Pricing"
        title="Start with a pilot. Scale only if it finds something."
        lede="Pricing is configured to AP volume and entity count and confirmed in writing before any work starts. We do not publish a binding list price."
      />
      <section className="mx-auto max-w-6xl px-4 py-12">
        {isLoading ? <LoadingState label="Loading plans" /> : null}
        {error ? (
          <ErrorState message={(error as Error).message} onRetry={() => void refetch()} />
        ) : null}
        {data ? (
          <div className="grid gap-px border border-border bg-border lg:grid-cols-3">
            {data.map((plan) => (
              <div
                key={plan.id}
                className={`flex flex-col bg-surface-raised p-6 ${
                  plan.highlighted ? "ring-1 ring-inset ring-primary" : ""
                }`}
              >
                <h2 className="text-base font-semibold">{plan.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{plan.audience}</p>
                <p className="num mt-4 text-lg">{plan.priceLabel}</p>
                <p className="mt-1 text-xs text-muted-foreground">{plan.billingNote}</p>
                <ul className="mt-5 flex-1 space-y-2 text-sm">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  asChild
                  variant={plan.highlighted ? "default" : "outline"}
                  className="mt-6"
                >
                  <Link to="/start" search={{ plan: plan.id }}>
                    {plan.ctaLabel}
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        ) : null}
        <p className="mt-6 max-w-2xl text-sm text-muted-foreground">
          Every engagement starts with a scoped Pilot Analysis so you can judge the exception output
          on your own AP history before committing to a subscription.
        </p>
      </section>
    </MarketingShell>
  );
}
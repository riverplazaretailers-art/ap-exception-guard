import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/product/states";
import { useSession } from "@/components/product/session";
import { MarketingShell } from "@/components/product/marketing-shell";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "Exception desk — AP Exception Desk" },
      {
        name: "description",
        content: "Work your open payables exceptions, review evidence and retain audit history.",
      },
    ],
  }),
  component: AppLayout,
});

/**
 * Client-side gate. Authorization is enforced by the backend on every request;
 * this only decides what to render for an unauthenticated visitor.
 */
function AppLayout() {
  const { user, isLoading } = useSession();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-md px-4 py-20">
        <LoadingState label="Checking your session" />
      </div>
    );
  }

  if (!user) {
    return (
      <MarketingShell>
        <section className="mx-auto max-w-md px-4 py-20 text-center">
          <h1 className="text-xl font-semibold">Sign in to reach the desk</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The exception queue is only available to signed-in account members.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Button asChild>
              <Link to="/sign-in">Sign in</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/start">Request access</Link>
            </Button>
          </div>
        </section>
      </MarketingShell>
    );
  }

  return <Outlet />;
}
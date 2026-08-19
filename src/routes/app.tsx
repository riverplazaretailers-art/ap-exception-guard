import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/product/states";
import { useSession } from "@/components/product/session";
import { MarketingShell } from "@/components/product/marketing-shell";
import { SecureWorkspaceAction, UnavailableHere } from "@/components/product/handoff";
import { can, isSecureLinkMode } from "@/lib/product";

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

  // secure-link mode holds no analyses at all: hand the visitor off rather than
  // presenting synthetic records as if they were their payables data.
  if (!can("list_analyses")) {
    return (
      <MarketingShell>
        <section className="mx-auto max-w-xl px-4 py-20">
          <UnavailableHere
            title="The exception desk runs in the secure workspace"
            action={
              <SecureWorkspaceAction path="/sign-in" label="Open secure workspace" />
            }
          >
            {isSecureLinkMode
              ? "This preview intentionally holds no analyses, findings or evidence. Sign in to the preserved AP Exception Desk workspace to work your queue."
              : "This environment has no data connection configured, so no analyses can be shown."}
          </UnavailableHere>
        </section>
      </MarketingShell>
    );
  }

  // When this shell has no session surface (api mode), the backend authorizes
  // every request itself and 401s surface as a permission-denied state.
  const gateOnSession = can("session_auth");

  if (gateOnSession && isLoading) {
    return (
      <div className="mx-auto max-w-md px-4 py-20">
        <LoadingState label="Checking your session" />
      </div>
    );
  }

  if (gateOnSession && !user) {
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
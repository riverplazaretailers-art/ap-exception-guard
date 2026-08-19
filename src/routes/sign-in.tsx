import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MarketingShell } from "@/components/product/marketing-shell";
import { ErrorState } from "@/components/product/states";
import { useSession } from "@/components/product/session";
import { isDemoMode } from "@/lib/product";

export const Route = createFileRoute("/sign-in")({
  head: () => ({
    meta: [
      { title: "Sign in — AP Exception Desk" },
      {
        name: "description",
        content: "Sign in to the AP Exception Desk review queue to work your open payables exceptions.",
      },
      { property: "og:title", content: "Sign in to AP Exception Desk" },
      { property: "og:description", content: "Access your payables exception review queue." },
    ],
  }),
  component: SignInPage,
});

function SignInPage() {
  const { signIn } = useSession();
  const navigate = useNavigate();
  const [email, setEmail] = useState(isDemoMode ? "controller@demo-account.example" : "");
  const [password, setPassword] = useState(isDemoMode ? "demo" : "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await signIn(email, password);
      await navigate({ to: "/app" });
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <MarketingShell>
      <section className="mx-auto max-w-md px-4 py-16">
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          For controllers, AP managers and finance partners with an active account.
        </p>
        {isDemoMode ? (
          <p className="mt-4 border-l-2 border-primary bg-accent px-3 py-2 text-xs text-accent-foreground">
            Demo mode: any work email signs you into a synthetic account. No real credentials are
            accepted or stored.
          </p>
        ) : null}
        <form onSubmit={onSubmit} className="panel mt-6 space-y-4 p-5">
          <div className="space-y-1.5">
            <Label htmlFor="email">Work email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error ? <ErrorState title="Could not sign in" message={error} /> : null}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        <p className="mt-4 text-sm text-muted-foreground">
          No account yet?{" "}
          <Link to="/start" className="font-medium text-primary hover:underline">
            Request a Pilot Analysis
          </Link>
        </p>
      </section>
    </MarketingShell>
  );
}
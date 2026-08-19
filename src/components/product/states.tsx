import { Link } from "@tanstack/react-router";
import { AlertTriangle, Inbox, Loader2, Lock } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { MODE_BANNER } from "@/lib/product";

export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-2 border border-border bg-surface-raised px-4 py-6 text-sm text-muted-foreground"
    >
      <Loader2 className="size-4 animate-spin" aria-hidden />
      {label}…
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="border border-dashed border-border bg-surface-raised px-6 py-10 text-center">
      <Inbox className="mx-auto size-5 text-muted-foreground" aria-hidden />
      <h3 className="mt-3 text-sm font-semibold">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="border-l-2 border-destructive bg-surface-raised px-4 py-4 text-sm ring-1 ring-border"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 size-4 text-destructive" aria-hidden />
        <div>
          <p className="font-semibold">{title}</p>
          <p className="mt-1 text-muted-foreground">{message}</p>
          {onRetry ? (
            <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>
              Try again
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function PermissionDenied({
  message = "Your role does not include access to this area. Ask an account administrator for the operator role.",
}: {
  message?: string;
}) {
  return (
    <div className="border border-border bg-surface-raised px-6 py-10 text-center">
      <Lock className="mx-auto size-5 text-muted-foreground" aria-hidden />
      <h3 className="mt-3 text-sm font-semibold">Permission denied</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{message}</p>
      <Button asChild variant="outline" size="sm" className="mt-4">
        <Link to="/app">Back to dashboard</Link>
      </Button>
    </div>
  );
}

export function SuccessNote({ children }: { children: ReactNode }) {
  return (
    <p
      role="status"
      className="border-l-2 border-[var(--status-resolved)] bg-[var(--status-resolved-surface)] px-3 py-2 text-sm text-[var(--status-resolved)]"
    >
      {children}
    </p>
  );
}

export function DemoModeBanner() {
  if (!MODE_BANNER) return null;
  return (
    <div className="border-b border-border bg-[var(--status-open-surface)] px-4 py-1.5 text-center text-xs font-medium text-[var(--status-open)]">
      {MODE_BANNER}
    </div>
  );
}
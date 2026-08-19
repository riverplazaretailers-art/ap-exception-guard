import { ExternalLink, Lock } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { workspaceLink } from "@/lib/product";

/**
 * Real work happens in the preserved secure AP Exception Desk workspace. When a
 * capability is not available in this shell we hand off instead of pretending.
 */
export function SecureWorkspaceAction({
  path,
  label,
  variant = "default",
  size = "default",
  className,
}: {
  path: string;
  label: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm";
  className?: string;
}) {
  const href = workspaceLink(path);
  if (!href) return null;
  return (
    <Button asChild variant={variant} size={size} {...(className ? { className } : {})}>
      <a href={href} rel="noopener noreferrer">
        {label}
        <ExternalLink className="ml-1.5 size-3.5" aria-hidden />
      </a>
    </Button>
  );
}

export function UnavailableHere({
  title = "Not available in this shell",
  children,
  action,
}: {
  title?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="border border-border bg-surface-raised px-5 py-5 text-sm">
      <p className="flex items-center gap-2 font-semibold">
        <Lock className="size-4 text-muted-foreground" aria-hidden />
        {title}
      </p>
      <p className="mt-1.5 max-w-xl text-muted-foreground">{children}</p>
      {action ? <div className="mt-4 flex flex-wrap gap-2">{action}</div> : null}
    </div>
  );
}

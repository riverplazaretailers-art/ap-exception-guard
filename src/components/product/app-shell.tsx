import { Link, useNavigate } from "@tanstack/react-router";
import {
  Activity,
  CircleHelp,
  CreditCard,
  FilePlus2,
  History,
  LayoutDashboard,
  LogOut,
  Settings,
} from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useSession } from "./session";
import { DemoModeBanner } from "./states";

const NAV = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/app/new", label: "New analysis", icon: FilePlus2 },
  { to: "/app/history", label: "History", icon: History },
  { to: "/app/ops", label: "Jobs & failures", icon: Activity },
  { to: "/app/settings", label: "Settings", icon: Settings },
  { to: "/app/billing", label: "Account & billing", icon: CreditCard },
  { to: "/app/help", label: "Help", icon: CircleHelp },
] as const;

export function AppShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string | undefined;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { user, signOut } = useSession();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <DemoModeBanner />
      <header className="border-b border-border bg-surface-raised">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-baseline gap-2">
            <Link to="/app" className="text-sm font-semibold tracking-tight">
              AP Exception Desk
            </Link>
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {user?.accountName}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-muted-foreground sm:inline">{user?.email}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await signOut();
                await navigate({ to: "/" });
              }}
            >
              <LogOut className="mr-1 size-3.5" aria-hidden /> Log out
            </Button>
          </div>
        </div>
        <nav
          aria-label="Desk"
          className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-2 pb-1 text-sm"
        >
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: "exact" in item ? item.exact : false }}
              className="flex shrink-0 items-center gap-1.5 border-b-2 border-transparent px-3 py-2 text-muted-foreground hover:text-foreground"
              activeProps={{ className: "border-primary text-foreground font-medium" }}
            >
              <item.icon className="size-3.5" aria-hidden />
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">{title}</h1>
            {description ? (
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

export function MetricTile({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string | undefined;
}) {
  return (
    <div className="bg-surface-raised p-4">
      <p className="eyebrow">{label}</p>
      <p className="num mt-2 text-xl">{value}</p>
      {note ? <p className="mt-1 text-xs text-muted-foreground">{note}</p> : null}
    </div>
  );
}
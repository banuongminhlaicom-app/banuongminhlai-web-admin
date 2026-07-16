import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Route as RouteIcon, DollarSign, User } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tab = {
  to: "/driver" | "/driver/trips" | "/driver/earnings" | "/driver/profile";
  label: string;
  Icon: typeof Home;
};

const TABS: Tab[] = [
  { to: "/driver", label: "Trang chủ", Icon: Home },
  { to: "/driver/trips", label: "Chuyến đi", Icon: RouteIcon },
  { to: "/driver/earnings", label: "Thu nhập", Icon: DollarSign },
  { to: "/driver/profile", label: "Tài khoản", Icon: User },
];

export function DriverShell({
  children,
  hideNav = false,
}: {
  children: ReactNode;
  hideNav?: boolean;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col bg-background">
      <main className={cn("flex-1", !hideNav && "pb-24")}>{children}</main>
      {!hideNav && <DriverNav pathname={pathname} />}
    </div>
  );
}

function DriverNav({ pathname }: { pathname: string }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md safe-bottom">
      <div className="mx-3 mb-2 rounded-3xl border border-border bg-surface/95 px-2 py-2 backdrop-blur-xl shadow-elevated">
        <ul className="grid grid-cols-4">
          {TABS.map(({ to, label, Icon }) => {
            const active = pathname === to || (to !== "/driver" && pathname.startsWith(to));
            return (
              <li key={to}>
                <Link
                  to={to}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-medium transition-colors",
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className={cn("h-5 w-5", active && "scale-110")} />
                  <span>{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

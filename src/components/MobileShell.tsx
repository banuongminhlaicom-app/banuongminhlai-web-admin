import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Route as RouteIcon, CalendarClock, Tag, User } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tab = {
  to: "/home" | "/trips" | "/schedule" | "/promotions" | "/profile";
  label: string;
  Icon: typeof Home;
  center?: boolean;
};
const TABS: Tab[] = [
  { to: "/home", label: "Trang chủ", Icon: Home },
  { to: "/trips", label: "Chuyến đi", Icon: RouteIcon },
  { to: "/schedule", label: "Đặt lịch", Icon: CalendarClock, center: true },
  { to: "/promotions", label: "Ưu đãi", Icon: Tag },
  { to: "/profile", label: "Tài khoản", Icon: User },
];

export function MobileShell({ children, hideNav = false }: { children: ReactNode; hideNav?: boolean }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col bg-background">
      <main className={cn("flex-1", !hideNav && "pb-24")}>{children}</main>
      {!hideNav && <BottomNav pathname={pathname} />}
    </div>
  );
}

function BottomNav({ pathname }: { pathname: string }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md safe-bottom">
      <div className="mx-3 mb-2 rounded-3xl border border-border bg-surface/95 px-2 py-2 backdrop-blur-xl shadow-elevated">
        <ul className="grid grid-cols-5 items-end">
          {TABS.map(({ to, label, Icon, center }) => {
            const active = pathname === to || (to !== "/home" && pathname.startsWith(to));
            if (center) {
              return (
                <li key={to} className="flex flex-col items-center">
                  <Link
                    to={to}
                    className="grid h-14 w-14 -translate-y-5 place-items-center rounded-full gradient-primary text-primary-foreground shadow-glow ring-4 ring-background"
                    aria-label={label}
                  >
                    <Icon className="h-6 w-6" />
                  </Link>
                  <span className={cn("-mt-3 text-[10px] font-semibold", active ? "text-primary" : "text-muted-foreground")}>
                    {label}
                  </span>
                </li>
              );
            }
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

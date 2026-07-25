import { Link, useRouterState } from "@tanstack/react-router";
import {
  Car,
  DollarSign,
  Gauge,
  Headphones,
  LayoutGrid,
  MapPin,
  Route as RouteIcon,
  Tag,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/admin", label: "Tổng quan", Icon: Gauge },
  { to: "/admin/bookings", label: "Chuyến đi", Icon: RouteIcon },
  { to: "/admin/drivers", label: "Tài xế", Icon: Car },
  { to: "/admin/customers", label: "Khách hàng", Icon: Users },
  { to: "/admin/pricing", label: "Bảng giá", Icon: DollarSign },
  { to: "/admin/promotions", label: "Ưu đãi", Icon: Tag },
  { to: "/admin/venues", label: "Địa điểm đối tác", Icon: MapPin },
  { to: "/admin/support", label: "Hỗ trợ", Icon: Headphones },
  { to: "/admin/reports", label: "Báo cáo", Icon: LayoutGrid },
] as const;

export function AdminLayout({ children, title }: { children: ReactNode; title: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid min-h-screen w-full max-w-[1400px] gap-4 p-4 md:grid-cols-[240px_1fr]">
        <aside className="hidden md:flex md:flex-col rounded-3xl bg-surface p-4">
          <BrandLogo />
          <div className="mt-1 text-[10px] uppercase text-muted-foreground">Bảng điều khiển</div>
          <nav className="mt-6 space-y-1">
            {NAV.map(({ to, label, Icon }) => {
              const active = to === "/admin" ? pathname === "/admin" : pathname.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                    active
                      ? "gradient-primary text-primary-foreground shadow-glow"
                      : "text-muted-foreground hover:bg-background hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" /> {label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto pt-4 text-[10px] text-muted-foreground">
            <Link to="/home" className="hover:text-foreground">
              ← Về khu khách hàng
            </Link>
          </div>
        </aside>

        <main className="min-w-0">
          <header className="mb-4 flex items-center justify-between rounded-3xl bg-surface p-4">
            <div className="min-w-0">
              <div className="text-[10px] uppercase text-muted-foreground">
                Admin · Bạn Uống Mình Lái
              </div>
              <h1 className="truncate text-xl font-black">{title}</h1>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <div className="rounded-full bg-success/20 px-3 py-1 text-xs font-bold text-success">
                ● Hệ thống ổn định
              </div>
              <div className="grid h-9 w-9 place-items-center rounded-full gradient-primary font-black text-primary-foreground">
                AD
              </div>
            </div>
          </header>

          {/* Mobile nav */}
          <div className="mb-4 flex gap-1 overflow-x-auto no-scrollbar rounded-2xl bg-surface p-1 md:hidden">
            {NAV.map(({ to, label, Icon }) => {
              const active = to === "/admin" ? pathname === "/admin" : pathname.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    "shrink-0 flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold",
                    active ? "gradient-primary text-primary-foreground" : "text-muted-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </Link>
              );
            })}
          </div>

          {children}
        </main>
      </div>
    </div>
  );
}

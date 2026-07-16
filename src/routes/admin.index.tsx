import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Car,
  DollarSign,
  Route as RouteIcon,
  Users,
  TrendingUp,
  XCircle,
  Activity,
  Loader2,
} from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { TRIP_STATUS_LABEL } from "@/lib/mock";
import { getAdminDashboardStats } from "@/lib/queries";
import { formatVND } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useRequireRole } from "@/lib/auth";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Admin · Tổng quan" }] }),
  component: AdminDashboard,
});

function AdminDashboard() {
  useRequireRole("admin");
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: getAdminDashboardStats,
  });

  if (isLoading || !stats) {
    return (
      <AdminLayout title="Tổng quan">
        <div className="grid h-40 place-items-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  const STATS: Array<{
    label: string;
    value: string;
    Icon: typeof RouteIcon;
    tone?: "primary" | "success" | "destructive" | "warning";
  }> = [
    { label: "Chuyến hôm nay", value: String(stats.tripsToday), Icon: RouteIcon, tone: "primary" },
    { label: "Đang diễn ra", value: String(stats.activeTrips), Icon: Activity, tone: "success" },
    {
      label: "Chuyến bị hủy hôm nay",
      value: String(stats.cancelledToday),
      Icon: XCircle,
      tone: "destructive",
    },
    { label: "Tổng khách hàng", value: stats.totalCustomers.toLocaleString("vi-VN"), Icon: Users },
    {
      label: "Tài xế đang online",
      value: `${stats.driversOnline}/${stats.driversTotal}`,
      Icon: Car,
      tone: "success",
    },
    {
      label: "Doanh thu hôm nay",
      value: formatVND(stats.revenueToday),
      Icon: DollarSign,
      tone: "primary",
    },
    { label: "Doanh thu tháng", value: formatVND(stats.revenueMonth), Icon: TrendingUp },
    {
      label: "Đánh giá TB",
      value: stats.avgRating != null ? `${stats.avgRating.toFixed(2)} ★` : "—",
      Icon: TrendingUp,
      tone: "warning",
    },
  ];

  return (
    <AdminLayout title="Tổng quan">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.label} className="rounded-3xl bg-surface p-4">
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">{s.label}</div>
              <div
                className={cn(
                  "grid h-8 w-8 place-items-center rounded-xl",
                  s.tone === "primary" && "bg-primary/20 text-primary",
                  s.tone === "success" && "bg-success/20 text-success",
                  s.tone === "destructive" && "bg-destructive/20 text-destructive",
                  s.tone === "warning" && "bg-warning/20 text-warning",
                  !s.tone && "bg-background text-foreground",
                )}
              >
                <s.Icon className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-black">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="rounded-3xl bg-surface p-5 lg:col-span-2">
          <h3 className="mb-3 font-black">Doanh thu 7 ngày qua</h3>
          <RevenueChart data={stats.revenueLast7Days} />
        </div>
        <div className="rounded-3xl bg-surface p-5">
          <h3 className="mb-3 font-black">Phân loại phương tiện (tháng này)</h3>
          {stats.vehicleDistribution.length === 0 ? (
            <div className="text-xs text-muted-foreground">
              Chưa có chuyến hoàn thành trong tháng.
            </div>
          ) : (
            <div className="space-y-3">
              {stats.vehicleDistribution.map((r, i) => (
                <div key={r.label}>
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold">{r.label}</span>
                    <span className="text-muted-foreground">{r.percent}%</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-background">
                    <div
                      className={cn("h-full", VEHICLE_COLORS[i % VEHICLE_COLORS.length])}
                      style={{ width: `${r.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-3xl bg-surface p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-black">Chuyến đi gần đây</h3>
        </div>
        {stats.recentTrips.length === 0 ? (
          <div className="text-sm text-muted-foreground">Chưa có chuyến nào.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="pb-2">Mã</th>
                  <th className="pb-2">Khách</th>
                  <th className="pb-2">Tài xế</th>
                  <th className="pb-2">Trạng thái</th>
                  <th className="pb-2 text-right">Tổng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {stats.recentTrips.map((t) => (
                  <tr key={t.id}>
                    <td className="py-2.5 font-mono text-xs">{t.code}</td>
                    <td className="py-2.5 font-semibold">{t.customer_name ?? "—"}</td>
                    <td className="py-2.5 text-muted-foreground">{t.driver_name ?? "—"}</td>
                    <td className="py-2.5">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-bold",
                          t.status === "completed" && "bg-success/20 text-success",
                          t.status === "cancelled" && "bg-destructive/20 text-destructive",
                          !["completed", "cancelled"].includes(t.status) &&
                            "bg-primary/20 text-primary",
                        )}
                      >
                        {TRIP_STATUS_LABEL[t.status]}
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-black">{formatVND(t.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

const VEHICLE_COLORS = ["bg-primary", "bg-success", "bg-warning", "bg-muted-foreground"];

function RevenueChart({ data }: { data: { label: string; total: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.total));
  return (
    <div className="flex h-40 items-stretch gap-2">
      {data.map((d, i) => (
        <div key={i} className="group flex flex-1 flex-col items-center gap-1">
          <div className="flex w-full flex-1 items-end">
            <div
              className="w-full rounded-t-lg gradient-primary transition-all group-hover:opacity-90"
              style={{ height: `${(d.total / max) * 100}%` }}
              title={formatVND(d.total)}
            />
          </div>
          <div className="text-[10px] text-muted-foreground">{d.label}</div>
        </div>
      ))}
    </div>
  );
}

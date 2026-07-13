import { createFileRoute } from "@tanstack/react-router";
import { Car, DollarSign, Route as RouteIcon, Users, TrendingUp, XCircle, Activity } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { MOCK_TRIPS, TRIP_STATUS_LABEL } from "@/lib/mock";
import { formatVND } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Admin · Tổng quan" }] }),
  component: AdminDashboard,
});

const STATS = [
  { label: "Chuyến hôm nay", value: "142", Icon: RouteIcon, tone: "primary" },
  { label: "Đang diễn ra", value: "18", Icon: Activity, tone: "success" },
  { label: "Chuyến bị hủy", value: "6", Icon: XCircle, tone: "destructive" },
  { label: "Tổng khách hàng", value: "2,845", Icon: Users },
  { label: "Tài xế đang online", value: "48/120", Icon: Car, tone: "success" },
  { label: "Doanh thu hôm nay", value: formatVND(18450000), Icon: DollarSign, tone: "primary" },
  { label: "Doanh thu tháng", value: formatVND(524000000), Icon: TrendingUp },
  { label: "Đánh giá TB", value: "4.87 ★", Icon: TrendingUp, tone: "warning" },
];

function AdminDashboard() {
  return (
    <AdminLayout title="Tổng quan">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.label} className="rounded-3xl bg-surface p-4">
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">{s.label}</div>
              <div className={cn(
                "grid h-8 w-8 place-items-center rounded-xl",
                s.tone === "primary" && "bg-primary/20 text-primary",
                s.tone === "success" && "bg-success/20 text-success",
                s.tone === "destructive" && "bg-destructive/20 text-destructive",
                s.tone === "warning" && "bg-warning/20 text-warning",
                !s.tone && "bg-background text-foreground",
              )}>
                <s.Icon className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-black">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="rounded-3xl bg-surface p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-black">Doanh thu 7 ngày qua</h3>
            <div className="rounded-full bg-primary/20 px-3 py-1 text-xs font-bold text-primary">+18% ↑</div>
          </div>
          <RevenueChart />
        </div>
        <div className="rounded-3xl bg-surface p-5">
          <h3 className="mb-3 font-black">Phân loại phương tiện</h3>
          <div className="space-y-3">
            {[
              { l: "Ô tô số tự động", v: 62, c: "bg-primary" },
              { l: "Ô tô số sàn", v: 18, c: "bg-success" },
              { l: "Xe 7 chỗ", v: 12, c: "bg-warning" },
              { l: "Xe máy", v: 8, c: "bg-muted-foreground" },
            ].map((r) => (
              <div key={r.l}>
                <div className="flex justify-between text-xs">
                  <span className="font-semibold">{r.l}</span>
                  <span className="text-muted-foreground">{r.v}%</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-background">
                  <div className={cn("h-full", r.c)} style={{ width: `${r.v}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-3xl bg-surface p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-black">Chuyến đi gần đây</h3>
        </div>
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
              {MOCK_TRIPS.slice(0, 5).map((t) => (
                <tr key={t.id}>
                  <td className="py-2.5 font-mono text-xs">{t.code}</td>
                  <td className="py-2.5 font-semibold">{t.customer}</td>
                  <td className="py-2.5 text-muted-foreground">{t.driver ?? "—"}</td>
                  <td className="py-2.5"><span className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-bold",
                    t.status === "completed" && "bg-success/20 text-success",
                    t.status === "cancelled" && "bg-destructive/20 text-destructive",
                    !["completed", "cancelled"].includes(t.status) && "bg-primary/20 text-primary",
                  )}>{TRIP_STATUS_LABEL[t.status]}</span></td>
                  <td className="py-2.5 text-right font-black">{formatVND(t.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}

function RevenueChart() {
  const data = [12, 15, 18, 14, 22, 25, 21];
  const max = Math.max(...data);
  const labels = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
  return (
    <div className="flex h-40 items-stretch gap-2">
      {data.map((v, i) => (
        <div key={i} className="group flex flex-1 flex-col items-center gap-1">
          <div className="flex w-full flex-1 items-end">
            <div
              className="w-full rounded-t-lg gradient-primary transition-all group-hover:opacity-90"
              style={{ height: `${(v / max) * 100}%` }}
            />
          </div>
          <div className="text-[10px] text-muted-foreground">{labels[i]}</div>
        </div>
      ))}
    </div>
  );
}

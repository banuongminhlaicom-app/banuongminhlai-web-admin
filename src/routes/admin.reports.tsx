import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { getAdminReportsStats } from "@/lib/queries";
import { formatVND } from "@/lib/format";
import { useRequireRole } from "@/lib/auth";

export const Route = createFileRoute("/admin/reports")({
  head: () => ({ meta: [{ title: "Admin · Báo cáo" }] }),
  component: AdminReports,
});

function formatDeltaPercent(delta: number | null, invert = false) {
  if (delta == null) return "Chưa có dữ liệu tháng trước";
  const good = invert ? delta <= 0 : delta >= 0;
  const sign = delta > 0 ? "+" : "";
  return {
    text: `${sign}${delta}% so với tháng trước`,
    tone: good ? ("success" as const) : undefined,
  };
}

function AdminReports() {
  useRequireRole("admin");
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin", "reports"],
    queryFn: getAdminReportsStats,
  });

  if (isLoading || !stats) {
    return (
      <AdminLayout title="Báo cáo & thống kê">
        <div className="grid h-40 place-items-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  const revenueDelta = formatDeltaPercent(stats.monthRevenueDeltaPercent);
  const tripsDelta = formatDeltaPercent(stats.completedTripsDeltaPercent);
  const cancelDelta =
    stats.cancelRateDeltaPoints == null
      ? "Chưa có dữ liệu tháng trước"
      : {
          text: `${stats.cancelRateDeltaPoints > 0 ? "+" : ""}${stats.cancelRateDeltaPoints} điểm % so với tháng trước`,
          tone: stats.cancelRateDeltaPoints <= 0 ? ("success" as const) : undefined,
        };

  return (
    <AdminLayout title="Báo cáo & thống kê">
      <div className="grid gap-4 md:grid-cols-3">
        <Card
          title="Tổng doanh thu tháng"
          value={formatVND(stats.monthRevenue)}
          delta={revenueDelta}
        />
        <Card
          title="Số chuyến hoàn thành"
          value={stats.completedTripsMonth.toLocaleString("vi-VN")}
          delta={tripsDelta}
        />
        <Card title="Tỷ lệ hủy" value={`${stats.cancelRatePercent}%`} delta={cancelDelta} />
      </div>

      <div className="mt-4 rounded-3xl bg-surface p-5">
        <h3 className="mb-3 font-black">Top 5 tài xế tháng này</h3>
        {stats.topDrivers.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            Chưa có chuyến hoàn thành nào trong tháng.
          </div>
        ) : (
          <div className="space-y-2">
            {stats.topDrivers.map((d, i) => (
              <div key={d.id} className="flex items-center gap-3 rounded-2xl bg-background p-3">
                <div className="grid h-8 w-8 place-items-center rounded-full gradient-primary text-sm font-black text-primary-foreground">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold">{d.name}</div>
                  <div className="text-xs text-muted-foreground">{d.trips} chuyến</div>
                </div>
                <div className="font-black text-primary">{formatVND(d.revenue)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function Card({
  title,
  value,
  delta,
}: {
  title: string;
  value: string;
  delta: string | { text: string; tone?: "success" };
}) {
  const text = typeof delta === "string" ? delta : delta.text;
  const tone = typeof delta === "string" ? undefined : delta.tone;
  return (
    <div className="rounded-3xl bg-surface p-5">
      <div className="text-xs text-muted-foreground">{title}</div>
      <div className="mt-2 text-3xl font-black">{value}</div>
      <div
        className={`mt-1 text-xs font-bold ${tone === "success" ? "text-success" : "text-primary"}`}
      >
        {text}
      </div>
    </div>
  );
}

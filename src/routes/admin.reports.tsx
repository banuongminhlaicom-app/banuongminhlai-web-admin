import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/AdminLayout";
import { formatVND } from "@/lib/format";

export const Route = createFileRoute("/admin/reports")({
  head: () => ({ meta: [{ title: "Admin · Báo cáo" }] }),
  component: AdminReports,
});

function AdminReports() {
  return (
    <AdminLayout title="Báo cáo & thống kê">
      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Tổng doanh thu tháng" value={formatVND(524000000)} delta="+18% so với tháng trước" />
        <Card title="Số chuyến hoàn thành" value="3,214" delta="+12%" />
        <Card title="Tỷ lệ hủy" value="4.2%" delta="-0.8%" tone="success" />
      </div>

      <div className="mt-4 rounded-3xl bg-surface p-5">
        <h3 className="mb-3 font-black">Top 5 tài xế tháng này</h3>
        <div className="space-y-2">
          {[
            { name: "Lê Thanh Bình", trips: 218, rev: 32100000 },
            { name: "Trần Minh Tuấn", trips: 195, rev: 28900000 },
            { name: "Võ Hoàng Long", trips: 172, rev: 24800000 },
            { name: "Nguyễn Văn Hùng", trips: 140, rev: 19200000 },
            { name: "Phạm Quốc Đạt", trips: 98, rev: 13400000 },
          ].map((d, i) => (
            <div key={d.name} className="flex items-center gap-3 rounded-2xl bg-background p-3">
              <div className="grid h-8 w-8 place-items-center rounded-full gradient-primary text-sm font-black text-primary-foreground">{i + 1}</div>
              <div className="flex-1">
                <div className="text-sm font-bold">{d.name}</div>
                <div className="text-xs text-muted-foreground">{d.trips} chuyến</div>
              </div>
              <div className="font-black text-primary">{formatVND(d.rev)}</div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}

function Card({ title, value, delta, tone }: { title: string; value: string; delta: string; tone?: "success" }) {
  return (
    <div className="rounded-3xl bg-surface p-5">
      <div className="text-xs text-muted-foreground">{title}</div>
      <div className="mt-2 text-3xl font-black">{value}</div>
      <div className={`mt-1 text-xs font-bold ${tone === "success" ? "text-success" : "text-primary"}`}>{delta}</div>
    </div>
  );
}

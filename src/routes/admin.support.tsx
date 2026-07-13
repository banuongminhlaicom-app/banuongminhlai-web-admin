import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/AdminLayout";

export const Route = createFileRoute("/admin/support")({
  head: () => ({ meta: [{ title: "Admin · Hỗ trợ" }] }),
  component: AdminSupport,
});

const TICKETS = [
  { id: "T-201", user: "Nguyễn Văn An", subject: "Bỏ quên ví trên xe BUML-8815", status: "Đang xử lý", time: "10 phút trước" },
  { id: "T-200", user: "Trần Thị Bích", subject: "Tài xế đến trễ hẹn 15 phút", status: "Mới", time: "35 phút trước" },
  { id: "T-199", user: "Lê Minh Khoa", subject: "Yêu cầu hoàn tiền chuyến bị hủy", status: "Đã xử lý", time: "2 giờ trước" },
];

function AdminSupport() {
  return (
    <AdminLayout title="Yêu cầu hỗ trợ">
      <div className="space-y-2">
        {TICKETS.map((t) => (
          <div key={t.id} className="flex items-center gap-3 rounded-2xl bg-surface p-4">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-background font-mono text-xs font-bold">{t.id}</div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold">{t.subject}</div>
              <div className="text-xs text-muted-foreground">{t.user} · {t.time}</div>
            </div>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              t.status === "Mới" ? "bg-primary/20 text-primary" : t.status === "Đang xử lý" ? "bg-warning/20 text-warning" : "bg-success/20 text-success"
            }`}>{t.status}</span>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}

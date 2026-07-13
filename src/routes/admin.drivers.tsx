import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/AdminLayout";
import { MOCK_DRIVERS } from "@/lib/mock";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/drivers")({
  head: () => ({ meta: [{ title: "Admin · Tài xế" }] }),
  component: AdminDrivers,
});

function AdminDrivers() {
  return (
    <AdminLayout title="Quản lý tài xế">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {MOCK_DRIVERS.map((d) => (
          <div key={d.id} className="rounded-3xl bg-surface p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl gradient-primary font-black text-primary-foreground shadow-glow">{d.avatar}</div>
              <div className="min-w-0 flex-1">
                <div className="font-bold">{d.name}</div>
                <div className="text-xs text-muted-foreground">Hạng {d.vehicleClass} · {d.yearsExperience} năm</div>
              </div>
              <div className={`rounded-full px-2 py-1 text-[10px] font-bold ${d.online ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"}`}>
                ● {d.online ? "Online" : "Offline"}
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl bg-background p-3 text-center text-xs">
              <div><div className="text-muted-foreground">Chuyến</div><div className="font-bold">{d.trips}</div></div>
              <div><div className="text-muted-foreground">Đánh giá</div><div className="font-bold">{d.rating} ★</div></div>
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={() => toast("Đã mở hồ sơ chi tiết")} className="flex-1 rounded-xl bg-background py-2 text-xs font-bold">Chi tiết</button>
              <button onClick={() => toast.success("Đã phê duyệt")} className="flex-1 rounded-xl gradient-primary py-2 text-xs font-bold text-primary-foreground">Phê duyệt</button>
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}

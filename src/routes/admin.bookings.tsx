import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/AdminLayout";
import { MOCK_TRIPS, TRIP_STATUS_LABEL } from "@/lib/mock";
import { formatKm, formatVND } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/bookings")({
  head: () => ({ meta: [{ title: "Admin · Chuyến đi" }] }),
  component: AdminBookings,
});

function AdminBookings() {
  return (
    <AdminLayout title="Quản lý chuyến đi">
      <div className="rounded-3xl bg-surface p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <input placeholder="Tìm theo mã chuyến, khách, tài xế..." className="flex-1 min-w-[200px] rounded-xl bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground" />
          <select className="rounded-xl bg-background px-3 py-2 text-sm">
            <option>Tất cả trạng thái</option>
            <option>Hoàn thành</option>
            <option>Đang thực hiện</option>
            <option>Đã hủy</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-muted-foreground">
                <th className="pb-2 pr-3">Mã</th>
                <th className="pb-2 pr-3">Khách</th>
                <th className="pb-2 pr-3">Tài xế</th>
                <th className="pb-2 pr-3">Điểm đón → đến</th>
                <th className="pb-2 pr-3">Phương tiện</th>
                <th className="pb-2 pr-3">KM</th>
                <th className="pb-2 pr-3">Trạng thái</th>
                <th className="pb-2 pr-3 text-right">Tổng</th>
                <th className="pb-2">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {MOCK_TRIPS.map((t) => (
                <tr key={t.id} className="align-top">
                  <td className="py-3 pr-3 font-mono text-xs">{t.code}</td>
                  <td className="py-3 pr-3 font-semibold">{t.customer}</td>
                  <td className="py-3 pr-3">{t.driver ?? <span className="text-muted-foreground">Chưa gán</span>}</td>
                  <td className="py-3 pr-3 text-xs">
                    <div className="font-semibold">{t.pickup}</div>
                    <div className="text-muted-foreground">→ {t.destination}</div>
                  </td>
                  <td className="py-3 pr-3 text-xs">{t.vehicleType}</td>
                  <td className="py-3 pr-3">{formatKm(t.distanceKm)}</td>
                  <td className="py-3 pr-3">
                    <span className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-bold",
                      t.status === "completed" && "bg-success/20 text-success",
                      t.status === "cancelled" && "bg-destructive/20 text-destructive",
                      !["completed", "cancelled"].includes(t.status) && "bg-primary/20 text-primary",
                    )}>{TRIP_STATUS_LABEL[t.status]}</span>
                  </td>
                  <td className="py-3 pr-3 text-right font-black">{formatVND(t.price)}</td>
                  <td className="py-3">
                    <div className="flex gap-1">
                      <button onClick={() => toast("Xem chi tiết chuyến")} className="rounded-md bg-background px-2 py-1 text-xs">Xem</button>
                      <button onClick={() => toast("Đã gán tài xế mới")} className="rounded-md bg-background px-2 py-1 text-xs">Gán</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}

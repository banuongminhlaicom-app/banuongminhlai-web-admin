import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { AdminLiveMap } from "@/components/AdminLiveMap";
import { getActiveTrips, getOnlineDrivers } from "@/lib/queries";
import { useRequireRole } from "@/lib/auth";

export const Route = createFileRoute("/admin/live")({
  head: () => ({ meta: [{ title: "Admin · Bản đồ trực tiếp" }] }),
  component: AdminLive,
});

const TRIP_STATUS_LABEL: Record<string, string> = {
  searching: "Đang tìm tài xế",
  accepted: "Tài xế đã nhận",
  arriving: "Tài xế đang đến",
  arrived: "Tài xế đã đến",
  in_progress: "Đang di chuyển",
};

const DRIVER_STATUS_LABEL: Record<string, string> = {
  online: "Đang chờ khách",
  assigned: "Vừa nhận chuyến",
  going_to_pickup: "Đang tới đón",
  arrived: "Đã tới điểm đón",
  met_customer: "Đã gặp khách",
  in_progress: "Đang chở khách",
};

function AdminLive() {
  useRequireRole("admin");

  // Đơn giản hoá bằng cách hỏi lại mỗi 5 giây thay vì tự dựng kênh realtime
  // riêng cho trang này — đủ "sống động" cho nhu cầu quan sát/điều phối, ít
  // rủi ro hơn so với quản lý thêm 1 bộ subscription mới.
  const { data: drivers = [], isLoading: driversLoading } = useQuery({
    queryKey: ["admin", "live-drivers"],
    queryFn: getOnlineDrivers,
    refetchInterval: 5000,
  });
  const { data: trips = [], isLoading: tripsLoading } = useQuery({
    queryKey: ["admin", "live-trips"],
    queryFn: getActiveTrips,
    refetchInterval: 5000,
  });

  return (
    <AdminLayout title="Bản đồ trực tiếp">
      <p className="mb-4 text-xs text-muted-foreground">
        Tài xế (chấm xanh) cập nhật vị trí GPS thật theo thời gian thực. Khách hàng (chấm đỏ) hiện tại
        điểm đón của chuyến đang diễn ra — khách không gửi GPS nên vị trí này đứng yên, không phải vị
        trí thật lúc chờ xe.
      </p>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="h-[70vh] overflow-hidden rounded-3xl bg-surface">
          <AdminLiveMap drivers={drivers} trips={trips} className="h-full w-full" />
        </div>

        <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto">
          <div className="rounded-3xl bg-surface p-4">
            <h2 className="mb-3 text-xs font-black uppercase text-muted-foreground">
              Tài xế online ({drivers.length})
            </h2>
            {driversLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : drivers.length === 0 ? (
              <p className="text-xs text-muted-foreground">Không có tài xế nào đang online.</p>
            ) : (
              <div className="space-y-2">
                {drivers.map((d) => (
                  <div key={d.id} className="rounded-2xl bg-background p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-bold">{d.full_name ?? "Tài xế"}</span>
                      <span className="shrink-0 text-xs font-bold text-primary">{d.rating.toFixed(1)} ★</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{DRIVER_STATUS_LABEL[d.status] ?? d.status}</span>
                      <span>{d.today_trips} chuyến hôm nay</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-3xl bg-surface p-4">
            <h2 className="mb-3 text-xs font-black uppercase text-muted-foreground">
              Chuyến đang diễn ra ({trips.length})
            </h2>
            {tripsLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : trips.length === 0 ? (
              <p className="text-xs text-muted-foreground">Không có chuyến nào đang diễn ra.</p>
            ) : (
              <div className="space-y-2">
                {trips.map((t) => (
                  <div key={t.id} className="rounded-2xl bg-background p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-bold">{t.customer_name ?? "Khách hàng"}</span>
                      <span className="shrink-0 text-xs font-black text-primary">
                        {TRIP_STATUS_LABEL[t.status] ?? t.status}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-[11px] text-muted-foreground">
                      {t.driver_name ? `Tài xế: ${t.driver_name}` : "Đang tìm tài xế..."}
                    </p>
                    <p className="mt-1 truncate text-[11px] text-muted-foreground">{t.pickup_address}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

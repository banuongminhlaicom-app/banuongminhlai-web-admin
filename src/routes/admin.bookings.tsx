import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { getAllTripsAdmin } from "@/lib/queries";
import { TRIP_STATUS_LABEL, type TripStatus } from "@/lib/mock";
import { formatKm, formatVND } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useRequireRole } from "@/lib/auth";

export const Route = createFileRoute("/admin/bookings")({
  head: () => ({ meta: [{ title: "Admin · Chuyến đi" }] }),
  component: AdminBookings,
});

function AdminBookings() {
  useRequireRole("admin");
  const { data: trips, isLoading } = useQuery({
    queryKey: ["admin", "trips"],
    queryFn: getAllTripsAdmin,
  });

  return (
    <AdminLayout title="Quản lý chuyến đi">
      <div className="rounded-3xl bg-surface p-5">
        <p className="mb-3 text-xs text-muted-foreground">200 chuyến gần nhất, mới nhất trước.</p>
        {isLoading ? (
          <div className="grid h-40 place-items-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : !trips || trips.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Chưa có chuyến nào.</div>
        ) : (
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
                {trips.map((t) => (
                  <tr key={t.id} className="align-top">
                    <td className="py-3 pr-3 font-mono text-xs">{t.code}</td>
                    <td className="py-3 pr-3 font-semibold">
                      {t.customer_name ?? <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="py-3 pr-3">
                      {t.driver_name ?? <span className="text-muted-foreground">Chưa gán</span>}
                    </td>
                    <td className="py-3 pr-3 text-xs">
                      <div className="font-semibold">{t.pickup_address}</div>
                      <div className="text-muted-foreground">→ {t.dropoff_address}</div>
                    </td>
                    <td className="py-3 pr-3 text-xs">{t.vehicle_type}</td>
                    <td className="py-3 pr-3">
                      {t.distance_km != null ? formatKm(t.distance_km) : "—"}
                    </td>
                    <td className="py-3 pr-3">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-bold",
                          t.status === "completed" && "bg-success/20 text-success",
                          t.status === "cancelled" && "bg-destructive/20 text-destructive",
                          !["completed", "cancelled"].includes(t.status) &&
                            "bg-primary/20 text-primary",
                        )}
                      >
                        {TRIP_STATUS_LABEL[t.status as TripStatus]}
                      </span>
                    </td>
                    <td className="py-3 pr-3 text-right font-black">{formatVND(t.price)}</td>
                    <td className="py-3">
                      <Link
                        to="/admin/bookings/$id"
                        params={{ id: t.id }}
                        className="rounded-md bg-background px-2 py-1 text-xs"
                      >
                        Xem
                      </Link>
                    </td>
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

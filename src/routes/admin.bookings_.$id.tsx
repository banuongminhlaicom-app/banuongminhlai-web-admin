import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { getTrip } from "@/lib/queries";
import { TRIP_STATUS_LABEL, type TripStatus } from "@/lib/mock";
import { formatKm, formatMinutes, formatVND, formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useRequireRole } from "@/lib/auth";

export const Route = createFileRoute("/admin/bookings_/$id")({
  head: () => ({ meta: [{ title: "Admin · Chi tiết chuyến đi" }] }),
  component: AdminBookingDetail,
});

const PAYMENT_LABEL: Record<string, string> = {
  cash: "Tiền mặt",
  transfer: "Chuyển khoản",
  qr: "QR ngân hàng",
};

function AdminBookingDetail() {
  useRequireRole("admin");
  const { id } = Route.useParams();
  const { data: trip, isLoading } = useQuery({
    queryKey: ["admin", "trip", id],
    queryFn: () => getTrip(id),
  });

  return (
    <AdminLayout title="Chi tiết chuyến đi">
      <Link
        to="/admin/bookings"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Về danh sách chuyến đi
      </Link>

      {isLoading ? (
        <div className="grid h-40 place-items-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : !trip ? (
        <div className="rounded-3xl bg-surface p-8 text-center text-sm text-muted-foreground">
          Không tìm thấy chuyến đi này.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-3xl bg-surface p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-mono text-xs text-muted-foreground">{trip.code}</div>
                <div className="mt-1 text-lg font-black">{formatVND(trip.price)}</div>
              </div>
              <span
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-bold",
                  trip.status === "completed" && "bg-success/20 text-success",
                  trip.status === "cancelled" && "bg-destructive/20 text-destructive",
                  !["completed", "cancelled"].includes(trip.status) && "bg-primary/20 text-primary",
                )}
              >
                {TRIP_STATUS_LABEL[trip.status as TripStatus]}
              </span>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Tạo lúc {formatRelativeTime(trip.created_at)}
              {trip.started_at && ` · Bắt đầu ${formatRelativeTime(trip.started_at)}`}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl bg-surface p-5">
              <h3 className="mb-3 text-xs font-black uppercase text-muted-foreground">Lộ trình</h3>
              <div className="flex items-start gap-3">
                <div className="mt-1 flex flex-col items-center gap-1">
                  <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                  <div className="h-8 w-px bg-border" />
                  <div className="h-2.5 w-2.5 rounded-full bg-success" />
                </div>
                <div className="flex-1 space-y-3 text-sm">
                  <div>
                    <div className="text-[10px] uppercase text-muted-foreground">Điểm đón</div>
                    <div className="font-semibold">{trip.pickup_address}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-muted-foreground">Điểm đến</div>
                    <div className="font-semibold">{trip.dropoff_address}</div>
                  </div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-3 text-center text-xs">
                <div>
                  <div className="text-muted-foreground">Quãng đường</div>
                  <div className="font-bold">
                    {trip.distance_km != null ? formatKm(trip.distance_km) : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Thời gian</div>
                  <div className="font-bold">
                    {trip.duration_min != null ? formatMinutes(trip.duration_min) : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Phương tiện</div>
                  <div className="font-bold">{trip.vehicle_type}</div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-surface p-5">
              <h3 className="mb-3 text-xs font-black uppercase text-muted-foreground">
                Thanh toán & đánh giá
              </h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Phương thức</dt>
                  <dd className="font-semibold">{PAYMENT_LABEL[trip.payment_method]}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Tổng tiền</dt>
                  <dd className="font-black text-primary">{formatVND(trip.price)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Đánh giá của khách</dt>
                  <dd className="font-semibold">
                    {trip.customer_rating != null ? `${trip.customer_rating} ★` : "Chưa đánh giá"}
                  </dd>
                </div>
                {trip.customer_feedback && (
                  <div>
                    <dt className="text-muted-foreground">Nhận xét</dt>
                    <dd className="mt-1 rounded-xl bg-background p-2.5 text-xs">
                      {trip.customer_feedback}
                    </dd>
                  </div>
                )}
                {trip.note && (
                  <div>
                    <dt className="text-muted-foreground">Ghi chú của khách</dt>
                    <dd className="mt-1 rounded-xl bg-background p-2.5 text-xs">{trip.note}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          <div className="rounded-3xl bg-surface p-5">
            <h3 className="mb-3 text-xs font-black uppercase text-muted-foreground">Định danh</h3>
            <dl className="grid gap-2 text-xs sm:grid-cols-2">
              <div className="flex justify-between gap-2 rounded-xl bg-background p-2.5">
                <dt className="text-muted-foreground">Mã khách hàng</dt>
                <dd className="font-mono">{trip.customer_id}</dd>
              </div>
              <div className="flex justify-between gap-2 rounded-xl bg-background p-2.5">
                <dt className="text-muted-foreground">Mã tài xế</dt>
                <dd className="font-mono">
                  {trip.driver_id ? (
                    <Link
                      to="/admin/drivers/$id"
                      params={{ id: trip.driver_id }}
                      className="text-primary hover:underline"
                    >
                      {trip.driver_id}
                    </Link>
                  ) : (
                    "Chưa gán"
                  )}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

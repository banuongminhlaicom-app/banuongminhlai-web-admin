import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, MessageSquare, Phone, ShieldAlert, Star, X } from "lucide-react";
import { MapPreview } from "@/components/MapPreview";
import { MOCK_DRIVERS, TRIP_STATUS_LABEL, type TripStatus } from "@/lib/mock";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useRequireRole } from "@/lib/auth";
import {
  cancelTrip,
  getAssignedDriverInfo,
  getDriverLocation,
  getTrip,
  rateTrip,
  subscribeDriverLocation,
  subscribeTripStatus,
} from "@/lib/queries";
import { GoongMap } from "@/components/GoongMap";
import { fetchRoute } from "@/lib/places";
import { formatKm, formatMinutes, formatVND } from "@/lib/format";

export const Route = createFileRoute("/booking_/$id")({
  component: BookingDetail,
});

const FLOW: TripStatus[] = ["accepted", "arriving", "arrived", "in_progress", "completed"];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function BookingDetail() {
  useRequireRole("customer");
  const { id } = Route.useParams();
  // Chuyến tạo qua booking.tsx (Giai đoạn 3) có id dạng UUID thật từ Supabase.
  // Các link cũ trỏ vào đây (vd. từ /trips lịch sử mock) dùng id ngắn kiểu
  // "8821" — giữ nguyên hành vi mô phỏng cũ để không phá chức năng đang chạy.
  return UUID_RE.test(id) ? <RealBookingDetail id={id} /> : <MockBookingDetail id={id} />;
}

function RealBookingDetail({ id }: { id: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: trip, isLoading } = useQuery({
    queryKey: ["trip", id],
    queryFn: () => getTrip(id),
    // Dự phòng cho lúc Realtime lỡ sự kiện (mất kết nối, subscribe trễ...).
    refetchInterval: 4000,
  });
  const { data: driver } = useQuery({
    queryKey: ["assigned-driver", trip?.driver_id],
    queryFn: () => getAssignedDriverInfo(trip!.driver_id!),
    enabled: !!trip?.driver_id,
  });

  useEffect(() => {
    return subscribeTripStatus(id, (updated) => {
      queryClient.setQueryData(["trip", id], updated);
    });
  }, [id, queryClient]);

  // Tuyến đường của chuyến (điểm đón -> điểm đến) để vẽ lên bản đồ. Tuyến không
  // đổi trong suốt chuyến nên chỉ gọi 1 lần, tránh tốn lượt gọi Goong.
  const { data: route } = useQuery({
    queryKey: [
      "trip-route",
      trip?.pickup_lat,
      trip?.pickup_lng,
      trip?.dropoff_lat,
      trip?.dropoff_lng,
    ],
    queryFn: () =>
      fetchRoute(
        { lat: trip!.pickup_lat!, lng: trip!.pickup_lng! },
        { lat: trip!.dropoff_lat!, lng: trip!.dropoff_lng! },
      ),
    enabled:
      trip?.pickup_lat != null &&
      trip?.pickup_lng != null &&
      trip?.dropoff_lat != null &&
      trip?.dropoff_lng != null,
    staleTime: Infinity,
  });

  // Theo dõi vị trí tài xế realtime để hiện xe di chuyển trên bản đồ. Chỉ chạy
  // khi chuyến đang diễn ra — xong chuyến thì dừng, không theo dõi nữa.
  const driverId = trip?.driver_id ?? null;
  const tripActive =
    trip != null && ["accepted", "arriving", "arrived", "in_progress"].includes(trip.status);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!driverId || !tripActive) {
      setDriverLocation(null);
      return;
    }
    // Lấy vị trí hiện có ngay, rồi nghe cập nhật realtime sau đó.
    getDriverLocation(driverId)
      .then((loc) => loc && setDriverLocation({ lat: loc.lat, lng: loc.lng }))
      .catch(() => {});
    return subscribeDriverLocation(driverId, (loc) =>
      setDriverLocation({ lat: loc.lat, lng: loc.lng }),
    );
  }, [driverId, tripActive]);

  useEffect(() => {
    if (trip?.status === "searching") {
      navigate({ to: "/booking/searching", search: { tripId: id } });
    }
  }, [trip?.status, id, navigate]);

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <div className="text-lg font-bold">Không tìm thấy chuyến đi</div>
        <button
          onClick={() => navigate({ to: "/trips" })}
          className="rounded-full gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow"
        >
          Về danh sách chuyến đi
        </button>
      </div>
    );
  }

  if (trip.status === "cancelled") {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <div className="text-4xl">🚫</div>
        <div className="text-lg font-bold">Chuyến đi đã bị huỷ</div>
        <div className="text-sm text-muted-foreground">Mã: {trip.code}</div>
        <button
          onClick={() => navigate({ to: "/home" })}
          className="rounded-full gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow"
        >
          Về trang chủ
        </button>
      </div>
    );
  }

  const status = trip.status as TripStatus;
  const isFinal = status === "completed";

  const cancel = async () => {
    try {
      await cancelTrip(id);
      toast("Đã hủy chuyến");
      navigate({ to: "/home" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không huỷ được chuyến.");
    }
  };

  return (
    <div className="relative mx-auto min-h-screen max-w-md bg-background">
      <GoongMap
        className="h-[55vh] w-full"
        pickup={
          trip.pickup_lat != null && trip.pickup_lng != null
            ? { lat: trip.pickup_lat, lng: trip.pickup_lng }
            : null
        }
        dropoff={
          trip.dropoff_lat != null && trip.dropoff_lng != null
            ? { lat: trip.dropoff_lat, lng: trip.dropoff_lng }
            : null
        }
        driver={driverLocation}
        routePolyline={route?.polyline}
        fallbackProps={{ showRoute: true, driverPin: true }}
      />

      <div className="safe-top absolute inset-x-0 top-0 flex items-center justify-between px-5 py-3">
        <button
          onClick={() => history.back()}
          className="grid h-10 w-10 place-items-center rounded-full bg-surface/95 backdrop-blur"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="rounded-full bg-surface/95 px-3 py-1.5 text-xs font-bold backdrop-blur">
          Mã: {trip.code}
        </div>
      </div>

      <div className="-mt-8 rounded-t-3xl bg-background px-5 pt-5 pb-32">
        <div
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold",
            isFinal ? "bg-success/20 text-success" : "bg-primary/20 text-primary",
          )}
        >
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              isFinal ? "bg-success" : "bg-primary animate-pulse",
            )}
          />
          {TRIP_STATUS_LABEL[status]}
        </div>

        {driver ? (
          <div className="mt-3 rounded-3xl bg-surface p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-14 w-14 place-items-center rounded-2xl gradient-primary text-lg font-black text-primary-foreground shadow-glow">
                {(driver.full_name ?? "Tài xế")
                  .split(" ")
                  .slice(-2)
                  .map((w) => w[0])
                  .join("")}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-base font-bold">{driver.full_name ?? "Tài xế"}</div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-warning text-warning" />{" "}
                    {driver.rating.toFixed(1)}
                  </span>
                  <span>· {driver.trips_count} chuyến</span>
                  <span>· {driver.years_experience} năm KN</span>
                </div>
                {driver.phone && (
                  <div className="mt-1 text-xs text-muted-foreground">SĐT: {driver.phone}</div>
                )}
              </div>
            </div>

            {!isFinal && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                <ActionBtn Icon={Phone} label="Gọi" onClick={() => toast("Đang gọi tài xế...")} />
                <ActionBtn
                  Icon={MessageSquare}
                  label="Nhắn tin"
                  onClick={() => toast("Mở khung chat")}
                />
                <ActionBtn
                  Icon={ShieldAlert}
                  label="Khẩn cấp"
                  tone="danger"
                  onClick={() => toast.error("Đã gửi tín hiệu khẩn cấp")}
                />
              </div>
            )}
          </div>
        ) : (
          !isFinal && (
            <div className="mt-3 rounded-3xl border border-dashed border-border bg-surface/60 p-4 text-center text-sm text-muted-foreground">
              Đang chờ thông tin tài xế...
            </div>
          )
        )}

        <div className="mt-3 rounded-3xl bg-surface p-4">
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
          <div className="mt-3 flex justify-around border-t border-border pt-3 text-center text-xs">
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
              <div className="text-muted-foreground">Tổng tiền</div>
              <div className="font-bold text-primary">{formatVND(trip.price)}</div>
            </div>
          </div>
        </div>

        {isFinal ? (
          <RealCompletedSection tripId={id} onDone={() => navigate({ to: "/trips" })} />
        ) : (
          <div className="mt-4 space-y-2">
            <div className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-4 text-center text-sm text-muted-foreground">
              Tài xế sẽ cập nhật trạng thái chuyến — màn hình này tự làm mới theo thời gian thực.
            </div>
            <button
              onClick={cancel}
              className="w-full rounded-2xl border border-border py-3 text-sm font-semibold text-muted-foreground"
            >
              <X className="mr-1 inline h-4 w-4" /> Hủy chuyến
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function RealCompletedSection({ tripId, onDone }: { tripId: string; onDone: () => void }) {
  const [rating, setRating] = useState(5);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    try {
      await rateTrip(tripId, rating, note);
      toast.success("Cảm ơn bạn đã đánh giá!");
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không gửi được đánh giá.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-4 rounded-3xl bg-surface p-4">
      <div className="text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-success/20 text-2xl">
          ✅
        </div>
        <div className="mt-2 text-base font-black">Chuyến đi hoàn thành</div>
        <div className="text-xs text-muted-foreground">Cảm ơn bạn đã sử dụng dịch vụ</div>
      </div>
      <div className="mt-4">
        <div className="text-xs font-semibold text-muted-foreground">Đánh giá tài xế</div>
        <div className="mt-2 flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} onClick={() => setRating(n)}>
              <Star
                className={cn("h-8 w-8", n <= rating ? "fill-warning text-warning" : "text-muted")}
              />
            </button>
          ))}
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Chia sẻ trải nghiệm của bạn..."
          className="mt-3 w-full rounded-2xl bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          rows={3}
        />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button className="rounded-2xl border border-border py-3 text-sm font-bold">
          Báo cáo sự cố
        </button>
        <button
          onClick={submit}
          disabled={submitting}
          className="flex items-center justify-center gap-1.5 rounded-2xl gradient-primary py-3 text-sm font-bold text-primary-foreground shadow-glow disabled:opacity-60"
        >
          {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Gửi đánh giá
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Nhánh mô phỏng cũ — giữ nguyên hành vi gốc cho các link dùng id ngắn (không
// phải UUID thật), ví dụ từ danh sách /trips vẫn còn là dữ liệu mock.
// ---------------------------------------------------------------------------
function MockBookingDetail({ id }: { id: string }) {
  const navigate = useNavigate();
  const driver = MOCK_DRIVERS[0];
  const [statusIdx, setStatusIdx] = useState(0);
  const status = FLOW[statusIdx];
  const isFinal = status === "completed";

  const advance = () => {
    if (statusIdx < FLOW.length - 1) setStatusIdx((i) => i + 1);
  };

  return (
    <div className="relative mx-auto min-h-screen max-w-md bg-background">
      <MapPreview className="h-[55vh] w-full" showRoute driverPin />

      <div className="safe-top absolute inset-x-0 top-0 flex items-center justify-between px-5 py-3">
        <button
          onClick={() => history.back()}
          className="grid h-10 w-10 place-items-center rounded-full bg-surface/95 backdrop-blur"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="rounded-full bg-surface/95 px-3 py-1.5 text-xs font-bold backdrop-blur">
          Mã: BUML-{id}
        </div>
      </div>

      <div className="-mt-8 rounded-t-3xl bg-background px-5 pt-5 pb-32">
        {/* Status pill */}
        <div
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold",
            isFinal ? "bg-success/20 text-success" : "bg-primary/20 text-primary",
          )}
        >
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              isFinal ? "bg-success" : "bg-primary animate-pulse",
            )}
          />
          {TRIP_STATUS_LABEL[status]}
        </div>

        {/* Driver card */}
        <div className="mt-3 rounded-3xl bg-surface p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-14 w-14 place-items-center rounded-2xl gradient-primary text-lg font-black text-primary-foreground shadow-glow">
              {driver.avatar}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-base font-bold">{driver.name}</div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-warning text-warning" /> {driver.rating}
                </span>
                <span>· {driver.trips} chuyến</span>
                <span>· {driver.yearsExperience} năm KN</span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">SĐT: {driver.phone}</div>
            </div>
            {!isFinal && (
              <div className="text-right">
                <div className="text-[10px] uppercase text-muted-foreground">Đến sau</div>
                <div className="text-xl font-black text-primary">{driver.etaMinutes}p</div>
              </div>
            )}
          </div>

          {!isFinal && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              <ActionBtn Icon={Phone} label="Gọi" onClick={() => toast("Đang gọi tài xế...")} />
              <ActionBtn
                Icon={MessageSquare}
                label="Nhắn tin"
                onClick={() => toast("Mở khung chat")}
              />
              <ActionBtn
                Icon={ShieldAlert}
                label="Khẩn cấp"
                tone="danger"
                onClick={() => toast.error("Đã gửi tín hiệu khẩn cấp")}
              />
            </div>
          )}
        </div>

        {/* Trip info */}
        <div className="mt-3 rounded-3xl bg-surface p-4">
          <div className="flex items-start gap-3">
            <div className="mt-1 flex flex-col items-center gap-1">
              <div className="h-2.5 w-2.5 rounded-full bg-primary" />
              <div className="h-8 w-px bg-border" />
              <div className="h-2.5 w-2.5 rounded-full bg-success" />
            </div>
            <div className="flex-1 space-y-3 text-sm">
              <div>
                <div className="text-[10px] uppercase text-muted-foreground">Điểm đón</div>
                <div className="font-semibold">Quán Bia Sài Gòn, Nguyễn Huệ</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-muted-foreground">Điểm đến</div>
                <div className="font-semibold">Phường Mỹ Phú, Cao Lãnh</div>
              </div>
            </div>
          </div>
          <div className="mt-3 flex justify-around border-t border-border pt-3 text-center text-xs">
            <div>
              <div className="text-muted-foreground">Quãng đường</div>
              <div className="font-bold">6,8 km</div>
            </div>
            <div>
              <div className="text-muted-foreground">Thời gian</div>
              <div className="font-bold">18 phút</div>
            </div>
            <div>
              <div className="text-muted-foreground">Tổng tiền</div>
              <div className="font-bold text-primary">127.000đ</div>
            </div>
          </div>
        </div>

        {isFinal ? (
          <CompletedSection onDone={() => navigate({ to: "/trips" })} />
        ) : (
          <div className="mt-4 space-y-2">
            <button
              onClick={advance}
              className="w-full rounded-2xl gradient-primary py-3.5 text-sm font-bold text-primary-foreground shadow-glow active:scale-[.98] transition"
            >
              Mô phỏng bước tiếp theo →{" "}
              {TRIP_STATUS_LABEL[FLOW[Math.min(statusIdx + 1, FLOW.length - 1)]]}
            </button>
            <button
              onClick={() => {
                toast("Đã hủy chuyến");
                navigate({ to: "/home" });
              }}
              className="w-full rounded-2xl border border-border py-3 text-sm font-semibold text-muted-foreground"
            >
              <X className="mr-1 inline h-4 w-4" /> Hủy chuyến
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ActionBtn({
  Icon,
  label,
  onClick,
  tone,
}: {
  Icon: typeof Phone;
  label: string;
  onClick: () => void;
  tone?: "danger";
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 rounded-2xl bg-background py-3 text-xs font-bold",
        tone === "danger" && "bg-destructive/15 text-destructive",
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function CompletedSection({ onDone }: { onDone: () => void }) {
  const [rating, setRating] = useState(5);
  const [note, setNote] = useState("");
  return (
    <div className="mt-4 rounded-3xl bg-surface p-4">
      <div className="text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-success/20 text-2xl">
          ✅
        </div>
        <div className="mt-2 text-base font-black">Chuyến đi hoàn thành</div>
        <div className="text-xs text-muted-foreground">Cảm ơn bạn đã sử dụng dịch vụ</div>
      </div>
      <div className="mt-4">
        <div className="text-xs font-semibold text-muted-foreground">Đánh giá tài xế</div>
        <div className="mt-2 flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} onClick={() => setRating(n)}>
              <Star
                className={cn("h-8 w-8", n <= rating ? "fill-warning text-warning" : "text-muted")}
              />
            </button>
          ))}
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Chia sẻ trải nghiệm của bạn..."
          className="mt-3 w-full rounded-2xl bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          rows={3}
        />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button className="rounded-2xl border border-border py-3 text-sm font-bold">
          Báo cáo sự cố
        </button>
        <button
          onClick={() => {
            toast.success("Cảm ơn bạn đã đánh giá!");
            onDone();
          }}
          className="rounded-2xl gradient-primary py-3 text-sm font-bold text-primary-foreground shadow-glow"
        >
          Gửi đánh giá
        </button>
      </div>
    </div>
  );
}

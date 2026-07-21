import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUp,
  ChevronUp,
  CornerUpLeft,
  CornerUpRight,
  Loader2,
  MessageSquare,
  Phone,
  Redo2,
  Undo2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useLocationTracking } from "@/hooks/use-location-tracking";
import { useWakeLock } from "@/hooks/use-wake-lock";
import { GoongMap } from "@/components/GoongMap";
import { fetchRoute, haversineKm } from "@/lib/places";
import { useAuthState, useRequireRole } from "@/lib/auth";
import {
  completeDriverTrip,
  getCustomerProfileForTrip,
  getDriverSelf,
  getTrip,
  markDriverArrived,
  setDriverStatus,
  subscribeDriverSelf,
  subscribeTripStatus,
  updateTripStatus,
  type DriverStatusDb,
  type TripRow,
} from "@/lib/queries";
import { formatKm, formatMinutes, formatVND } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/driver/trips/$id")({
  head: () => ({ meta: [{ title: "Chuyến đi hiện tại" }] }),
  component: DriverTripDetail,
});

function maskPhone(phone: string) {
  if (phone.length < 6) return phone;
  return `${phone.slice(0, phone.length - 4)}••${phone.slice(-2)}`;
}

function DriverTripDetail() {
  useRequireRole("driver");
  const { id } = Route.useParams();
  const authState = useAuthState();
  const driverId = authState.session?.user.id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: trip, isLoading: tripLoading } = useQuery({
    queryKey: ["trip", id],
    queryFn: () => getTrip(id),
    // Dự phòng cho lúc Realtime lỡ sự kiện (mất kết nối, subscribe trễ...).
    refetchInterval: 4000,
  });
  const { data: driverSelf } = useQuery({
    queryKey: ["driver-self", driverId],
    queryFn: () => getDriverSelf(driverId!),
    enabled: !!driverId,
    refetchInterval: 4000,
  });
  const { data: customer } = useQuery({
    queryKey: ["customer-profile", trip?.customer_id],
    queryFn: () => getCustomerProfileForTrip(trip!.customer_id),
    enabled: !!trip,
  });

  useEffect(
    () => subscribeTripStatus(id, (updated) => queryClient.setQueryData(["trip", id], updated)),
    [id, queryClient],
  );
  useEffect(() => {
    if (!driverId) return;
    return subscribeDriverSelf(driverId, (row) =>
      queryClient.setQueryData(["driver-self", driverId], row),
    );
  }, [driverId, queryClient]);

  const [summaryOpen, setSummaryOpen] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);

  useEffect(() => {
    if (!tripLoading && !trip) navigate({ to: "/driver" });
  }, [tripLoading, trip, navigate]);

  const driverStatus = driverSelf?.status;
  const startedAtMs = trip?.started_at ? new Date(trip.started_at).getTime() : null;
  const elapsed = useElapsed(driverStatus === "in_progress" ? startedAtMs : null);

  const isOnTrip =
    driverStatus != null && driverStatus !== "offline" && driverStatus !== "completed";
  // Camera 3D bám theo hướng xe chạy chỉ bật lúc tài xế thực sự đang di chuyển
  // tới 1 điểm cụ thể (đi đón / đang chở khách) — lúc chờ ở điểm đón thì không
  // cần nghiêng/xoay camera liên tục.
  const followCamera = driverStatus === "going_to_pickup" || driverStatus === "in_progress";

  // Bám vị trí GPS suốt chuyến (từ lúc đi đón tới lúc trả khách) để khách theo
  // dõi được xe trên bản đồ. Dừng ngay khi chuyến kết thúc. onPosition cập
  // nhật vị trí tại chỗ (không tốn API) để tự tính khoảng cách/ETA còn lại.
  const [livePos, setLivePos] = useState<{ lat: number; lng: number } | null>(null);
  useLocationTracking(isOnTrip, setLivePos);

  // Giữ màn hình luôn sáng khi đang chạy chuyến — điện thoại tự tắt màn hình
  // sẽ khiến trình duyệt ngưng luôn GPS, làm khách mất theo dõi vị trí.
  useWakeLock(isOnTrip);

  // Cảnh báo nếu tài xế ẩn trình duyệt (chuyển app khác) rồi quay lại giữa lúc
  // đang chạy chuyến — GPS có thể đã bị hệ điều hành tạm ngưng trong lúc đó.
  useEffect(() => {
    if (!isOnTrip) return;
    let wasHidden = false;
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        wasHidden = true;
      } else if (wasHidden) {
        wasHidden = false;
        toast.warning(
          "Việc ẩn trình duyệt có thể làm gián đoạn chuyến đi và GPS. Vui lòng giữ màn hình luôn mở.",
          { duration: 6000 },
        );
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [isOnTrip]);

  // Bottom sheet thu gọn/mở rộng: bấm vào tay cầm hoặc vuốt lên/xuống trên đó.
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const sheetTouchStartYRef = useRef<number | null>(null);
  const onSheetTouchStart = (e: React.TouchEvent) => {
    sheetTouchStartYRef.current = e.touches[0]?.clientY ?? null;
  };
  const onSheetTouchEnd = (e: React.TouchEvent) => {
    const startY = sheetTouchStartYRef.current;
    sheetTouchStartYRef.current = null;
    if (startY == null) return;
    const deltaY = (e.changedTouches[0]?.clientY ?? startY) - startY;
    if (deltaY < -24) setSheetExpanded(true);
    else if (deltaY > 24) setSheetExpanded(false);
  };

  // Điểm đang hướng tới: điểm đón khi chưa gặp khách, điểm trả khi đang chở khách.
  const targetCoord =
    driverStatus === "in_progress"
      ? trip?.dropoff_lat != null && trip?.dropoff_lng != null
        ? { lat: trip.dropoff_lat, lng: trip.dropoff_lng }
        : null
      : trip?.pickup_lat != null && trip?.pickup_lng != null
        ? { lat: trip.pickup_lat, lng: trip.pickup_lng }
        : null;

  // Chốt lại điểm gốc để tính tuyến — chỉ dời điểm gốc khi tài xế đã đi xa hơn
  // 50m so với lần tính trước, tránh gọi lại Directions API theo từng nhịp GPS
  // (route đã có cache 10 phút + rate limit ở places.ts, đây là lớp giảm tải thêm).
  const [routeOrigin, setRouteOrigin] = useState<{ lat: number; lng: number } | null>(null);
  useEffect(() => {
    if (!livePos) return;
    if (!routeOrigin || haversineKm(routeOrigin, livePos) > 0.05) {
      setRouteOrigin(livePos);
    }
  }, [livePos, routeOrigin]);

  // Tuyến đường sống: từ vị trí hiện tại của tài xế tới điểm đang hướng đến
  // (điểm đón hoặc điểm trả) — vẽ lên bản đồ + dùng để chỉ đường từng bước.
  const { data: liveRoute } = useQuery({
    queryKey: ["nav-route", routeOrigin?.lat, routeOrigin?.lng, targetCoord?.lat, targetCoord?.lng],
    queryFn: () => fetchRoute(routeOrigin!, targetCoord!),
    enabled: !!routeOrigin && !!targetCoord,
    staleTime: 60_000,
  });

  // Chỉ đường từng bước theo tuyến vừa tính, tự chuyển sang bước kế khi tài xế
  // tới gần điểm cuối của bước hiện tại. Không giọng nói — tài xế nhìn tuyến đã
  // vẽ trên bản đồ + banner này để biết rẽ ở đâu, giống Grab nhưng không đọc.
  const steps = liveRoute?.steps;
  const [stepIndex, setStepIndex] = useState(0);
  useEffect(() => setStepIndex(0), [steps]);
  useEffect(() => {
    const step = steps?.[stepIndex];
    if (!livePos || !step || !steps) return;
    if (haversineKm(livePos, step.end) * 1000 < 30 && stepIndex < steps.length - 1) {
      setStepIndex((i) => i + 1);
    }
  }, [livePos, steps, stepIndex]);
  const currentStep = steps?.[stepIndex] ?? null;
  const stepDistanceM =
    livePos && currentStep ? Math.round(haversineKm(livePos, currentStep.end) * 1000) : null;

  // Khoảng cách còn lại tới đích: ưu tiên số liệu tuyến thật (đường bộ), rơi về
  // đường chim bay × 1.3 nếu tuyến chưa tính xong.
  const remaining =
    liveRoute != null
      ? { km: liveRoute.distanceKm }
      : livePos && targetCoord
        ? { km: haversineKm(livePos, targetCoord) * 1.3 }
        : null;

  const cta = useMemo(() => {
    switch (driverStatus) {
      case "going_to_pickup":
        return { label: "Tôi đã đến điểm đón", next: "arrived" as const };
      case "arrived":
        return { label: "Xác nhận đã gặp khách", next: "met_customer" as const };
      case "met_customer":
        return { label: "Bắt đầu chuyến đi", next: "in_progress" as const };
      case "in_progress":
        return { label: "Hoàn thành chuyến đi", next: "SUMMARY" as const };
      case "assigned":
        return { label: "Bắt đầu đi đón khách", next: "going_to_pickup" as const };
      default:
        return null;
    }
  }, [driverStatus]);

  const handleCta = async () => {
    if (!cta || !driverId || !trip) return;
    if (cta.next === "SUMMARY") {
      setSummaryOpen(true);
      return;
    }
    try {
      if (cta.next === "arrived") {
        await markDriverArrived(trip.id, driverId);
      } else if (cta.next === "in_progress") {
        await updateTripStatus(trip.id, "in_progress");
        await setDriverStatus(driverId, "in_progress");
      } else {
        await setDriverStatus(driverId, cta.next as DriverStatusDb);
      }
      toast.success(cta.label);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra.");
    }
  };

  if (!trip || !driverSelf) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const progress = ["going_to_pickup", "arrived", "met_customer", "in_progress"].indexOf(
    driverStatus ?? "",
  );

  const statusText =
    driverStatus === "in_progress"
      ? "Đang đưa khách về điểm đến"
      : driverStatus === "going_to_pickup"
        ? "Đang đến điểm đón khách"
        : driverStatus === "arrived"
          ? "Đã tới điểm đón"
          : driverStatus === "met_customer"
            ? "Đã gặp khách — chờ PIN"
            : "Chuẩn bị lên đường";

  return (
    <div className="fixed inset-0 mx-auto max-w-md bg-background">
      <GoongMap
        className="absolute inset-0 h-full w-full"
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
        driver={livePos}
        routePolyline={liveRoute?.polyline}
        navigate={followCamera}
        fallbackProps={{ showRoute: true, driverPin: true }}
      />

      {currentStep ? (
        // Banner dẫn đường kiểu Grab/Google Maps: tối màu, ép sát cạnh trên
        // cùng (không viền/bo góc nổi như thẻ trắng cũ), icon rẽ + khoảng cách
        // to rõ + tên đường kế tiếp — đọc được nhanh khi đang lái.
        <div className="safe-top absolute inset-x-0 top-0 z-10 bg-[#0b0f1a]/95 pb-3 shadow-elevated backdrop-blur">
          <div className="flex items-center justify-between px-4 pt-3">
            <button
              onClick={() => navigate({ to: "/driver" })}
              className="grid h-9 w-9 place-items-center rounded-full bg-white/15 text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white">
              {trip.code}
            </div>
          </div>
          <div className="mt-2 flex items-center gap-3 px-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/15 text-white">
              <ManeuverIcon maneuver={currentStep.maneuver} className="h-7 w-7" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-2xl font-black leading-tight text-white">
                {stepDistanceM != null
                  ? stepDistanceM < 1000
                    ? `${stepDistanceM} m`
                    : formatKm(stepDistanceM / 1000)
                  : "—"}
              </div>
              <div className="truncate text-sm font-medium text-white/70">
                {currentStep.instruction}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="safe-top absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 py-3">
          <button
            onClick={() => navigate({ to: "/driver" })}
            className="grid h-10 w-10 place-items-center rounded-full bg-surface/95 shadow-elevated backdrop-blur"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="rounded-full bg-surface/95 px-3 py-1.5 text-xs font-bold shadow-elevated backdrop-blur">
            {trip.code}
          </div>
        </div>
      )}

      {/* Bottom sheet: thu gọn chỉ còn ETA + nút thao tác chính, vuốt lên/bấm
          vào tay cầm để xem chi tiết đơn (khách hàng, địa chỉ, giá...). */}
      <div className="safe-bottom absolute inset-x-0 bottom-0 z-20">
        <div className="rounded-t-3xl bg-background shadow-elevated">
          <button
            type="button"
            onClick={() => setSheetExpanded((v) => !v)}
            onTouchStart={onSheetTouchStart}
            onTouchEnd={onSheetTouchEnd}
            className="flex w-full items-center justify-center pt-2 pb-1"
            aria-label={sheetExpanded ? "Thu gọn chi tiết chuyến" : "Xem chi tiết chuyến"}
          >
            <span className="h-1.5 w-10 rounded-full bg-muted" />
          </button>

          <div className="flex items-center gap-3 px-5 pb-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                {statusText}
                <ChevronUp
                  className={cn(
                    "h-3 w-3 shrink-0 transition-transform",
                    sheetExpanded && "rotate-180",
                  )}
                />
              </div>
              <div className="text-sm font-black">
                {remaining
                  ? `Còn ${formatKm(remaining.km)} · ${formatMinutes((remaining.km / 30) * 60)}`
                  : "Đang định vị…"}
              </div>
            </div>
            {cta && (
              <button
                onClick={handleCta}
                className="shrink-0 rounded-2xl gradient-primary px-5 py-3 text-xs font-black uppercase tracking-wide text-primary-foreground shadow-glow"
              >
                {cta.label}
              </button>
            )}
          </div>

          <div
            className={cn(
              "overflow-hidden transition-[max-height] duration-300 ease-out",
              sheetExpanded ? "max-h-[65vh] overflow-y-auto" : "max-h-0",
            )}
          >
            <div className="space-y-3 px-5 pb-6">
              <div className="rounded-3xl bg-surface p-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-background text-lg font-black text-primary">
                    {(customer?.full_name ?? "Khách hàng")
                      .split(" ")
                      .slice(-2)
                      .map((w) => w[0])
                      .join("")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold">{customer?.full_name ?? "Khách hàng"}</div>
                    <div className="text-xs text-muted-foreground">
                      {customer?.phone ? maskPhone(customer.phone) : "Chưa có số điện thoại"}
                    </div>
                  </div>
                  <button
                    onClick={() => toast("Đang gọi khách...")}
                    className="grid h-10 w-10 place-items-center rounded-full bg-success/20 text-success"
                    aria-label="Gọi khách"
                  >
                    <Phone className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => toast("Mở khung chat")}
                    className="grid h-10 w-10 place-items-center rounded-full bg-background"
                    aria-label="Nhắn tin"
                  >
                    <MessageSquare className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-3 border-t border-border/60 pt-3 text-center text-[11px]">
                  <Cell label="Xe khách" value={trip.vehicle_type} />
                </div>
              </div>

              <div className="rounded-3xl bg-surface p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex flex-col items-center gap-1">
                    <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                    <div className="h-10 w-px bg-border" />
                    <div className="h-2.5 w-2.5 rounded-full bg-success" />
                  </div>
                  <div className="flex-1 space-y-3 text-xs">
                    <div>
                      <div className="text-[10px] uppercase text-muted-foreground">Điểm đón</div>
                      <div className="text-sm font-bold">{trip.pickup_address}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase text-muted-foreground">
                        Điểm đến · {trip.distance_km != null ? formatKm(trip.distance_km) : "—"}
                      </div>
                      <div className="text-sm font-bold">{trip.dropoff_address}</div>
                    </div>
                  </div>
                </div>

                {trip.note && (
                  <div className="mt-3 flex items-center justify-between rounded-2xl bg-background/60 p-3 text-xs">
                    <span className="text-muted-foreground">Ghi chú của khách</span>
                    <span className="ml-2 text-right font-semibold text-foreground">
                      {trip.note}
                    </span>
                  </div>
                )}

                <div className="mt-3 flex items-center justify-between rounded-2xl bg-primary/10 p-3">
                  <span className="text-xs text-muted-foreground">Giá chuyến</span>
                  <span className="text-lg font-black text-primary">{formatVND(trip.price)}</span>
                </div>
              </div>

              {driverStatus === "in_progress" && (
                <div className="grid grid-cols-2 gap-2 rounded-3xl bg-surface p-4 text-center text-xs">
                  <div>
                    <div className="text-muted-foreground">Đã đi</div>
                    <div className="mt-1 text-lg font-black">{elapsed}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Quãng đường</div>
                    <div className="mt-1 text-lg font-black">
                      {trip.distance_km != null ? formatKm(trip.distance_km) : "—"}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 text-xs">
                <ActionBtn
                  label="Báo sự cố"
                  Icon={AlertTriangle}
                  onClick={() => setIssueOpen(true)}
                />
                <ActionBtn
                  label="Hỗ trợ"
                  Icon={Phone}
                  onClick={() => toast("Đang kết nối tổng đài...")}
                />
              </div>

              {driverStatus !== "in_progress" && (
                <div className="rounded-3xl bg-surface p-3">
                  <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                    Tiến trình
                  </div>
                  <ol className="grid grid-cols-4 gap-1 text-[10px]">
                    {["Đi đón", "Đã tới", "Gặp khách", "Chở khách"].map((step, i) => (
                      <li
                        key={step}
                        className={`rounded-lg py-2 text-center font-bold ${
                          i <= progress
                            ? "gradient-primary text-primary-foreground shadow-glow"
                            : "bg-background text-muted-foreground"
                        }`}
                      >
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {summaryOpen && driverId && (
        <SummarySheet
          trip={trip}
          driverTodayTrips={driverSelf.today_trips}
          driverTodayRevenue={driverSelf.today_revenue}
          onClose={() => setSummaryOpen(false)}
          onDone={async (todayTrips, todayRevenue) => {
            try {
              await completeDriverTrip(driverId, trip.id, { todayTrips, todayRevenue });
              setSummaryOpen(false);
              toast.success("Đã hoàn thành chuyến đi!");
              navigate({ to: "/driver" });
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Không hoàn thành được chuyến.");
            }
          }}
        />
      )}

      {issueOpen && (
        <IssueSheet
          onClose={() => setIssueOpen(false)}
          onSubmit={(reason) => {
            setIssueOpen(false);
            toast.error(`Đã gửi báo cáo: ${reason}`);
          }}
        />
      )}
    </div>
  );
}

function useElapsed(startedAt: number | null) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!startedAt) return;
    const t = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(t);
  }, [startedAt]);
  if (!startedAt) return "0 phút";
  return formatMinutes(Math.max(0, (now - startedAt) / 60000));
}

function ActionBtn({
  label,
  Icon,
  onClick,
}: {
  label: string;
  Icon: typeof Phone;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 rounded-2xl bg-surface p-3 font-semibold"
    >
      <Icon className="h-4 w-4 text-primary" />
      {label}
    </button>
  );
}

// Icon rẽ theo "maneuver" Goong trả về (left/right/slight left/straight/uturn...).
// Chưa gặp loại nào thì rơi về mũi tên thẳng.
function ManeuverIcon({
  maneuver,
  className = "h-5 w-5",
}: {
  maneuver: string | null;
  className?: string;
}) {
  switch (maneuver) {
    case "left":
    case "slight left":
    case "sharp left":
      return <CornerUpLeft className={className} />;
    case "right":
    case "slight right":
    case "sharp right":
      return <CornerUpRight className={className} />;
    case "uturn-left":
      return <Undo2 className={className} />;
    case "uturn-right":
      return <Redo2 className={className} />;
    default:
      return <ArrowUp className={className} />;
  }
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-xs font-black">{value}</div>
    </div>
  );
}

function SummarySheet({
  trip,
  driverTodayTrips,
  driverTodayRevenue,
  onClose,
  onDone,
}: {
  trip: TripRow;
  driverTodayTrips: number;
  driverTodayRevenue: number;
  onClose: () => void;
  onDone: (todayTrips: number, todayRevenue: number) => void;
}) {
  const surcharge = 15000;
  const total = trip.price + surcharge;
  const [method, setMethod] = useState<"cash" | "bank" | "qr">("cash");
  const [confirmed, setConfirmed] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-t-3xl bg-background p-5 pb-8 safe-bottom">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-muted" />
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black">Tổng kết chuyến đi</h3>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full bg-surface"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 space-y-1 rounded-2xl bg-surface p-3 text-xs">
          <Row label="Điểm đón" value={trip.pickup_address} />
          <Row label="Điểm đến" value={trip.dropoff_address} />
          <Row
            label="Quãng đường"
            value={trip.distance_km != null ? formatKm(trip.distance_km) : "—"}
          />
          <div className="my-2 border-t border-border/60" />
          <Row label="Giá dự kiến" value={formatVND(trip.price)} />
          <Row label="Phụ phí chờ" value={formatVND(surcharge)} />
          <Row label="Tổng tiền" value={formatVND(total)} emphasize />
        </div>

        <div className="mt-3">
          <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
            Khách thanh toán bằng
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "cash", label: "Tiền mặt" },
              { id: "bank", label: "Chuyển khoản" },
              { id: "qr", label: "QR" },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setMethod(m.id as typeof method)}
                className={`rounded-2xl border py-3 text-xs font-bold ${
                  method === m.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-surface"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <label className="mt-3 flex items-center gap-2 rounded-2xl bg-surface p-3 text-xs">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          <span>Tôi xác nhận đã nhận đủ tiền.</span>
        </label>

        <button
          onClick={() => onDone(driverTodayTrips + 1, driverTodayRevenue + total)}
          disabled={!confirmed}
          className="mt-4 w-full rounded-2xl gradient-primary py-4 text-sm font-black uppercase text-primary-foreground shadow-glow disabled:opacity-50"
        >
          Xác nhận hoàn thành
        </button>
      </div>
    </div>
  );
}

function IssueSheet({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (reason: string) => void;
}) {
  const reasons = [
    "Không tìm thấy khách",
    "Khách đổi điểm đến",
    "Sự cố xe khách",
    "Tai nạn / va chạm nhẹ",
    "Khách không hợp tác",
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-t-3xl bg-background p-5 pb-8 safe-bottom">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-muted" />
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black">Báo sự cố</h3>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full bg-surface"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3 space-y-2">
          {reasons.map((r) => (
            <button
              key={r}
              onClick={() => onSubmit(r)}
              className="w-full rounded-2xl bg-surface p-3 text-left text-sm font-semibold"
            >
              {r}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, emphasize }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={emphasize ? "font-bold" : "text-muted-foreground"}>{label}</span>
      <span className={emphasize ? "text-base font-black text-primary" : "font-semibold"}>
        {value}
      </span>
    </div>
  );
}

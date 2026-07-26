import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUp,
  CornerUpLeft,
  CornerUpRight,
  LifeBuoy,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  Phone,
  Power,
  Redo2,
  Route as RouteIcon,
  Star,
  Undo2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useLocationTracking } from "@/hooks/use-location-tracking";
import { useWakeLock } from "@/hooks/use-wake-lock";
import { useTripChatAlerts } from "@/hooks/use-trip-chat-alerts";
import { GoongMap } from "@/components/GoongMap";
import { TripChat } from "@/components/TripChat";
import { fetchRoute, haversineKm } from "@/lib/places";
import { useAuthState, useRequireRole } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  completeDriverTrip,
  getCustomerProfileForTrip,
  getDriverSelf,
  getTrip,
  markDriverArrived,
  rateCustomer,
  setDriverStatus,
  subscribeDriverSelf,
  subscribeTripStatus,
  updateTripStatus,
  type DriverStatusDb,
  type TripRow,
} from "@/lib/queries";
import { formatKm, formatMinutes, formatVND } from "@/lib/format";

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
  const [ratingOpen, setRatingOpen] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  // Báo có tin nhắn mới từ khách (âm thanh + toast + badge) khi tài xế không
  // đang mở sẵn khung chat — để không bỏ lỡ dù đang xem bản đồ/dẫn đường.
  const { unreadCount: chatUnread } = useTripChatAlerts({
    tripId: id,
    selfId: driverId ?? null,
    peerName: customer?.full_name ?? "Khách hàng",
    chatOpen,
  });

  // Gọi khách bằng số điện thoại thật (mở app điện thoại của máy — miễn phí).
  const callCustomer = () => {
    if (customer?.phone) window.location.href = `tel:${customer.phone}`;
    else toast("Khách chưa cập nhật số điện thoại.");
  };

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

  // Mở overlay "Tổng quan" xem chi tiết đầy đủ chuyến đi.
  const [sheetExpanded, setSheetExpanded] = useState(false);

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
  // Goong/Google Directions: maneuver + instruction của 1 step mô tả cú rẽ để
  // BẮT ĐẦU step đó (đã rẽ xong), không phải cú rẽ SẮP tới ở cuối step hiện
  // tại. Cú rẽ sắp tới thật sự nằm ở step KẾ TIẾP — currentStep chỉ dùng để
  // tính khoảng cách còn lại tới điểm rẽ đó.
  const upcomingStep = steps?.[stepIndex + 1] ?? currentStep;

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

  const inProgress = driverStatus === "in_progress";
  const stepLabel = inProgress ? "2. Trả khách" : "1. Đón khách";
  const targetAddress = inProgress ? trip.dropoff_address : trip.pickup_address;
  const etaText = remaining
    ? `${formatMinutes((remaining.km / 30) * 60)} • ${
        remaining.km < 1 ? `${Math.round(remaining.km * 1000)} m` : formatKm(remaining.km)
      }`
    : "Đang định vị…";

  return (
    <div className="fixed inset-0 mx-auto flex max-w-md flex-col bg-background">
      {/* ============ NỬA TRÊN: BẢN ĐỒ + LỚP PHỦ ============ */}
      <div className="relative flex-1 overflow-hidden">
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

        {/* Turn-by-turn badge (góc trên trái): nền đen, icon rẽ + khoảng cách */}
        <div className="safe-top pointer-events-none absolute inset-x-0 top-0 flex items-start gap-2 px-3 pt-3">
          <div className="flex items-center gap-2 rounded-2xl bg-[#111827] px-3 py-2 text-white shadow-elevated">
            <ManeuverIcon maneuver={upcomingStep?.maneuver ?? null} className="h-6 w-6" />
            <span className="text-xl font-black leading-none">
              {currentStep && stepDistanceM != null
                ? stepDistanceM < 1000
                  ? `${stepDistanceM} m`
                  : formatKm(stepDistanceM / 1000)
                : "—"}
            </span>
          </div>
          {upcomingStep?.instruction && (
            <div className="max-w-[52%] truncate rounded-2xl bg-[#1d4ed8] px-3 py-2 text-xs font-bold text-white shadow-elevated">
              {upcomingStep.instruction}
            </div>
          )}
        </div>

        {/* ETA badge (thẻ trắng đè mép dưới bản đồ, căn giữa) */}
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
          <div className="rounded-full bg-white px-4 py-1.5 text-sm font-bold text-[#111827] shadow-elevated">
            {etaText}
          </div>
        </div>
      </div>

      {/* ============ NỬA DƯỚI: BOTTOM SHEET ============ */}
      <div className="safe-bottom shrink-0 rounded-t-3xl bg-white shadow-[0_-4px_24px_rgba(0,0,0,0.12)]">
        {/* Row 1: trạng thái chuyến đi */}
        <div className="grid grid-cols-3 items-center px-4 pt-3 pb-2">
          <div className="flex items-center gap-1.5 text-[#374151]">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-[#111827] text-xs font-black text-white">
              1
            </span>
            <span className="text-xs font-semibold">Địa điểm</span>
          </div>
          <div className="text-center">
            <div className="text-sm font-black text-[#f0592b]">{stepLabel}</div>
            <div className="text-[11px] text-muted-foreground">{trip.vehicle_type}</div>
          </div>
          <button
            onClick={() => setSheetExpanded(true)}
            className="flex items-center justify-end gap-1 text-[#374151]"
          >
            <RouteIcon className="h-4 w-4" />
            <span className="text-xs font-semibold">Chi tiết chuyến</span>
          </button>
        </div>

        {/* Row 2: chi tiết cuốc xe */}
        <div className="px-4 pb-3">
          <div className="truncate text-sm font-semibold text-[#374151]">
            {customer?.full_name ?? "Khách hàng"}
          </div>
          <div className="mt-0.5 line-clamp-2 text-[17px] font-bold leading-snug text-[#111827]">
            {targetAddress}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-sm font-black text-[#111827]">{formatVND(trip.price)}</span>
            <PaymentBadge method={trip.payment_method} />
          </div>
        </div>

        {/* Row 3: thanh công cụ (4 cột, có vạch chia) */}
        <div className="grid grid-cols-4 border-t border-[#e5e7eb]">
          <ToolCell
            Icon={MessageSquare}
            label="Chat"
            badge={chatUnread}
            onClick={() => setChatOpen(true)}
          />
          <ToolCell Icon={Phone} label="Gọi khách" onClick={callCustomer} divider />
          <ToolCell
            Icon={LifeBuoy}
            label="Trung tâm Hỗ trợ"
            onClick={() => toast("Đang kết nối tổng đài...")}
            divider
          />
          <ToolCell
            Icon={MoreHorizontal}
            label="Xem thêm"
            onClick={() => setIssueOpen(true)}
            divider
          />
        </div>

        {/* Row 4: nút hành động chính + nút tròn */}
        <div className="flex items-center gap-3 border-t border-[#e5e7eb] px-4 py-3">
          <button
            onClick={handleCta}
            disabled={!cta}
            className="h-14 flex-1 rounded-2xl bg-[#00b14f] text-base font-black text-white shadow-glow transition active:scale-[.98] disabled:opacity-50"
          >
            {cta?.label ?? "Đang cập nhật…"}
          </button>
          <button
            onClick={() => navigate({ to: "/driver" })}
            aria-label="Thoát màn hình chuyến"
            className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#00b14f] text-white shadow-glow transition active:scale-[.96]"
          >
            <Power className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Overlay chi tiết đầy đủ — mở từ "Tổng quan" */}
      {sheetExpanded && (
        <div
          className="absolute inset-0 z-30 flex flex-col justify-end bg-black/50"
          onClick={() => setSheetExpanded(false)}
        >
          <div
            className="safe-bottom max-h-[82vh] overflow-y-auto rounded-t-3xl bg-background p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-black">Chi tiết chuyến đi</h3>
              <button
                onClick={() => setSheetExpanded(false)}
                className="grid h-8 w-8 place-items-center rounded-full bg-surface"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
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
                    onClick={callCustomer}
                    className="grid h-10 w-10 place-items-center rounded-full bg-success/20 text-success"
                    aria-label="Gọi khách"
                  >
                    <Phone className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setChatOpen(true)}
                    className="relative grid h-10 w-10 place-items-center rounded-full bg-background"
                    aria-label="Nhắn tin"
                  >
                    {!!chatUnread && (
                      <span className="absolute right-0 top-0 grid h-4 min-w-4 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-black text-white">
                        {chatUnread > 9 ? "9+" : chatUnread}
                      </span>
                    )}
                    <MessageSquare className="h-4 w-4" />
                  </button>
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

              {inProgress && (
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

              {!inProgress && (
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
      )}

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
              setRatingOpen(true);
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Không hoàn thành được chuyến.");
            }
          }}
        />
      )}

      {ratingOpen && (
        <RateCustomerSheet
          tripId={trip.id}
          customerName={customer?.full_name ?? "Khách hàng"}
          onDone={() => {
            setRatingOpen(false);
            navigate({ to: "/driver" });
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

      {chatOpen && driverId && (
        <TripChat
          tripId={trip.id}
          selfId={driverId}
          role="driver"
          peerName={customer?.full_name ?? "Khách hàng"}
          onClose={() => setChatOpen(false)}
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

// Một ô trong thanh công cụ 4 cột của bottom sheet (Chat / Gọi / Hỗ trợ / Xem
// thêm). `divider` vẽ vạch chia mờ bên trái, ngăn cách với ô trước.
function ToolCell({
  label,
  Icon,
  onClick,
  divider,
  badge,
}: {
  label: string;
  Icon: typeof Phone;
  onClick: () => void;
  divider?: boolean;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center gap-1 px-1 py-3 text-[11px] font-medium text-[#374151]",
        divider && "border-l border-[#e5e7eb]",
      )}
    >
      {!!badge && (
        <span className="absolute right-2 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-black text-white">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
      <Icon className="h-5 w-5 text-[#111827]" />
      <span className="text-center leading-tight">{label}</span>
    </button>
  );
}

// Badge phương thức thanh toán: tiền mặt (xám) vs thẻ/ví (xanh dương).
function PaymentBadge({ method }: { method: "cash" | "transfer" | "qr" }) {
  const isCash = method === "cash";
  return (
    <span
      className={cn(
        "rounded-md px-2 py-0.5 text-[11px] font-bold",
        isCash ? "bg-[#e5e7eb] text-[#374151]" : "bg-[#2563eb] text-white",
      )}
    >
      {isCash ? "Tiền mặt" : "Thẻ / Ví"}
    </span>
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

// Tài xế đánh giá khách ngay sau khi hoàn thành chuyến — chiều ngược lại của
// RealCompletedSection ở booking_.$id.tsx (khách đánh giá tài xế). Có nút
// "Bỏ qua" vì đánh giá khách không bắt buộc, không nên chặn tài xế về màn hình chính.
function RateCustomerSheet({
  tripId,
  customerName,
  onDone,
}: {
  tripId: string;
  customerName: string;
  onDone: () => void;
}) {
  const [rating, setRating] = useState(5);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    try {
      await rateCustomer(tripId, rating, note);
      toast.success("Cảm ơn bạn đã đánh giá!");
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không gửi được đánh giá.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60 backdrop-blur-sm">
      <div className="safe-bottom w-full max-w-md rounded-t-3xl bg-background p-5 pb-8">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-muted" />
        <div className="text-center">
          <div className="text-base font-black">Đánh giá khách hàng</div>
          <div className="mt-0.5 text-xs text-muted-foreground">{customerName}</div>
        </div>

        <div className="mt-4 flex justify-center gap-2">
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
          rows={3}
          placeholder="Nhận xét về khách (không bắt buộc)..."
          className="mt-3 w-full resize-none rounded-2xl bg-surface p-3 text-base outline-none focus:ring-2 focus:ring-primary/40"
        />

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={onDone}
            className="rounded-2xl border border-border py-3 text-sm font-bold"
          >
            Bỏ qua
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

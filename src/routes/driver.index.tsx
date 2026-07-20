import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  BadgeCheck,
  Clock,
  DollarSign,
  HeadphonesIcon,
  History,
  LifeBuoy,
  Loader2,
  LocateFixed,
  MapPin,
  PhoneCall,
  Route as RouteIcon,
  Search,
  Star,
  Wallet,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { useLocationTracking } from "@/hooks/use-location-tracking";
import { MapPreview } from "@/components/MapPreview";
import { DriverShell } from "@/components/DriverShell";
import { useAuthState, useRequireRole } from "@/lib/auth";
import {
  acceptAssignedTrip,
  getDriverSelf,
  getTrip,
  rejectAssignedTrip,
  setAutoAccept,
  setDriverOnline,
  subscribeDriverSelf,
  type TripRow,
} from "@/lib/queries";
import { formatKm, formatVND } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/driver/")({
  head: () => ({ meta: [{ title: "Tài xế — Bạn Uống Mình Lái" }] }),
  component: DriverHome,
});

function DriverHome() {
  useRequireRole("driver");
  const authState = useAuthState();
  const driverId = authState.session?.user.id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: driverSelf } = useQuery({
    queryKey: ["driver-self", driverId],
    queryFn: () => getDriverSelf(driverId!),
    enabled: !!driverId,
    // Dự phòng cho lúc Realtime lỡ sự kiện (mất kết nối, subscribe trễ...).
    refetchInterval: 4000,
  });

  useEffect(() => {
    if (!driverId) return;
    return subscribeDriverSelf(driverId, (row) => {
      queryClient.setQueryData(["driver-self", driverId], row);
    });
  }, [driverId, queryClient]);

  const currentTripId = driverSelf?.current_trip_id ?? null;
  const { data: currentTrip } = useQuery({
    queryKey: ["trip", currentTripId],
    queryFn: () => getTrip(currentTripId!),
    enabled: !!currentTripId,
  });

  const [showAssign, setShowAssign] = useState(false);
  const [countdown, setCountdown] = useState(20);
  const timerRef = useRef<number | null>(null);
  const autoAcceptedFor = useRef<string | null>(null);

  const acceptTrip = async () => {
    if (!driverId || !currentTrip) return;
    setShowAssign(false);
    try {
      await acceptAssignedTrip(currentTrip.id, driverId);
      toast.success("Đã nhận chuyến. Đi đón khách nào!");
      navigate({ to: "/driver/trips/$id", params: { id: currentTrip.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không nhận được chuyến.");
    }
  };

  // Chuyến vừa được hệ thống tự gán (status="assigned", chưa nhận/từ chối).
  useEffect(() => {
    if (!driverSelf || !currentTrip) return;
    if (driverSelf.status !== "assigned") {
      setShowAssign(false);
      return;
    }
    if (driverSelf.auto_accept) {
      if (autoAcceptedFor.current === currentTrip.id) return;
      autoAcceptedFor.current = currentTrip.id;
      acceptTrip();
    } else {
      setShowAssign(true);
      setCountdown(20);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driverSelf?.status, currentTrip?.id, driverSelf?.auto_accept]);

  useEffect(() => {
    if (!showAssign) return;
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          window.clearInterval(timerRef.current!);
          handleTimeout();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAssign]);

  const handleTimeout = async () => {
    setShowAssign(false);
    if (!driverId || !currentTrip) return;
    try {
      await rejectAssignedTrip(currentTrip.id, driverId);
      toast("Chuyến đã được chuyển cho tài xế khác.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra.");
    }
  };

  const rejectTrip = async () => {
    if (!driverId || !currentTrip) return;
    setShowAssign(false);
    try {
      await rejectAssignedTrip(currentTrip.id, driverId);
      toast("Đã từ chối chuyến.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra.");
    }
  };

  const toggleOnline = async () => {
    if (!driverSelf || !driverId) return;
    if (driverSelf.status !== "offline" && driverSelf.status !== "online") {
      toast.error("Không thể chuyển trạng thái khi đang có chuyến.");
      return;
    }
    try {
      await setDriverOnline(driverId, !driverSelf.online);
      toast(!driverSelf.online ? "Bạn đang trực tuyến" : "Bạn đã ngoại tuyến");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không cập nhật được trạng thái.");
    }
  };

  const onlineSinceMs = driverSelf?.online_since
    ? new Date(driverSelf.online_since).getTime()
    : null;
  const onlineDuration = useOnlineDuration(onlineSinceMs);
  const hasAssignedTrip = Boolean(
    currentTrip && driverSelf && driverSelf.status !== "offline" && driverSelf.status !== "online",
  );
  const online = driverSelf?.online ?? false;

  // Gửi vị trí GPS lên server khi tài xế online, để khách thấy xe di chuyển.
  useLocationTracking(online);

  return (
    <DriverShell>
      {/* ============ HEADER ============ */}
      <header className="safe-top bg-surface px-4 pt-3 pb-3 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <div className="grid h-12 w-12 place-items-center rounded-full gradient-primary text-sm font-black text-primary-foreground">
              TX
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full bg-background">
              <BadgeCheck className="h-4 w-4 text-success" />
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] text-muted-foreground leading-tight">Chào bạn,</div>
            <div className="text-[15px] font-bold leading-tight truncate">Tài xế</div>
            <div className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-success/15 px-1.5 py-0.5 text-[10px] font-semibold text-success">
              <BadgeCheck className="h-3 w-3" />
              Tài xế đã xác minh
            </div>
          </div>
          <Link
            to="/notifications"
            className="grid h-10 w-10 place-items-center rounded-full bg-background border border-border"
            aria-label="Thông báo"
          >
            <Bell className="h-4 w-4" />
          </Link>
          <Link
            to="/support"
            className="grid h-10 w-10 place-items-center rounded-full bg-background border border-border"
            aria-label="Hỗ trợ"
          >
            <HeadphonesIcon className="h-4 w-4" />
          </Link>
        </div>
      </header>

      {/* ============ ONLINE STATUS CARD ============ */}
      <section className="px-4 pt-4">
        <div
          className={cn(
            "relative overflow-hidden rounded-3xl border p-4 transition-colors",
            online ? "border-success/40 bg-success/10" : "border-border bg-muted/40",
          )}
        >
          {online && (
            <span className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-success/20 blur-2xl animate-pulse" />
          )}
          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "h-2.5 w-2.5 rounded-full",
                    online ? "bg-success animate-pulse" : "bg-muted-foreground/60",
                  )}
                />
                <div className="text-[15px] font-bold">
                  {online ? "Bạn đang trực tuyến" : "Bạn đang ngoại tuyến"}
                </div>
              </div>
              <div className="mt-1 text-[12px] text-muted-foreground leading-snug">
                {online
                  ? "Hệ thống đang tìm chuyến phù hợp gần bạn."
                  : "Bật trạng thái trực tuyến để bắt đầu nhận chuyến."}
              </div>
            </div>
            <button
              onClick={toggleOnline}
              aria-label="Bật/tắt trực tuyến"
              className={cn(
                "relative h-9 w-16 shrink-0 rounded-full transition-colors",
                online ? "bg-success" : "bg-muted-foreground/40",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-8 w-8 rounded-full bg-white shadow-elevated transition-transform",
                  online ? "translate-x-7" : "translate-x-0.5",
                )}
              />
            </button>
          </div>

          <button
            onClick={toggleOnline}
            className={cn(
              "relative mt-4 w-full rounded-2xl py-3 text-[13px] font-black tracking-wide uppercase transition",
              online
                ? "bg-success text-white shadow-glow"
                : "gradient-primary text-primary-foreground shadow-glow",
            )}
          >
            {online ? "Đang nhận chuyến" : "Bắt đầu nhận chuyến"}
          </button>

          <label className="relative mt-3 flex items-center justify-between rounded-2xl bg-background/70 px-3 py-2">
            <span className="flex items-center gap-2 text-[12px] font-semibold">
              <Zap className="h-3.5 w-3.5 text-primary" />
              Tự động nhận chuyến
            </span>
            <input
              type="checkbox"
              checked={driverSelf?.auto_accept ?? true}
              onChange={(e) => driverId && setAutoAccept(driverId, e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
          </label>
        </div>
      </section>

      {/* ============ MAP ============ */}
      <section className="px-4 pt-4">
        <div
          className={cn(
            "relative overflow-hidden rounded-3xl border border-border transition-opacity",
            !online && "opacity-70",
          )}
        >
          <MapPreview className="h-52 w-full" showNearbyDrivers />

          <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center px-3">
            <div
              className={cn(
                "pointer-events-auto rounded-full px-3 py-1.5 text-[11px] font-bold shadow-elevated backdrop-blur-md",
                online ? "bg-success/90 text-white" : "bg-background/90 text-foreground",
              )}
            >
              {online ? "Đang tìm chuyến trong bán kính 5 km" : "Bạn cần bật Online để nhận chuyến"}
            </div>
          </div>

          <div className="pointer-events-none absolute left-3 bottom-3 rounded-full bg-warning/95 px-2.5 py-1 text-[10px] font-bold text-black shadow-elevated">
            🔥 Khu vực nhu cầu cao: P.2, P.4
          </div>

          <button
            className="absolute right-3 bottom-3 grid h-10 w-10 place-items-center rounded-full bg-background border border-border shadow-elevated"
            aria-label="Định vị lại"
            onClick={() => toast("Đã cập nhật vị trí của bạn")}
          >
            <LocateFixed className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* ============ QUICK STATS ============ */}
      <section className="px-4 pt-4">
        <div className="grid grid-cols-2 gap-2">
          <StatCard
            label="Chuyến hôm nay"
            value={String(driverSelf?.today_trips ?? 0)}
            Icon={RouteIcon}
          />
          <StatCard
            label="Doanh thu hôm nay"
            value={formatVND(driverSelf?.today_revenue ?? 0)}
            Icon={DollarSign}
          />
          <StatCard
            label="Thời gian Online"
            value={onlineSinceMs ? onlineDuration : "0g 0p"}
            Icon={Clock}
          />
          <StatCard
            label="Đánh giá"
            value={`${(driverSelf?.rating ?? 5).toFixed(1).replace(".", ",")} ★`}
            Icon={Star}
          />
        </div>
      </section>

      {/* ============ CURRENT ACTIVITY ============ */}
      <section className="px-4 pt-4">
        <h2 className="mb-2 px-1 text-[13px] font-bold">Hoạt động hiện tại</h2>

        {hasAssignedTrip && currentTrip ? (
          <Link
            to="/driver/trips/$id"
            params={{ id: currentTrip.id }}
            className="block rounded-2xl border border-primary/40 bg-primary/5 p-4"
          >
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-black uppercase text-primary-foreground">
                Chuyến đang thực hiện
              </span>
              <span className="text-[11px] text-muted-foreground">{currentTrip.code}</span>
            </div>
            <div className="mt-2 flex items-start gap-2 text-[12px]">
              <MapPin className="mt-0.5 h-3.5 w-3.5 text-primary shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="font-bold truncate">{currentTrip.pickup_address}</div>
                <div className="text-muted-foreground truncate">
                  → {currentTrip.dropoff_address}
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="text-[11px] text-muted-foreground">
                {currentTrip.distance_km != null ? formatKm(currentTrip.distance_km) : "—"} ·{" "}
                {currentTrip.vehicle_type}
              </div>
              <div className="text-sm font-black text-primary">{formatVND(currentTrip.price)}</div>
            </div>
            <div className="mt-3 rounded-xl bg-primary py-2 text-center text-[12px] font-black text-primary-foreground">
              XEM CHUYẾN →
            </div>
          </Link>
        ) : online ? (
          <div className="rounded-2xl border border-dashed border-success/40 bg-success/5 p-5 text-center">
            <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-full bg-success/15">
              <Loader2 className="h-5 w-5 animate-spin text-success" />
            </div>
            <div className="text-[13px] font-bold">Đang chờ chuyến mới…</div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              Hệ thống sẽ tự động gán chuyến phù hợp cho bạn.
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-surface p-5 text-center">
            <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-full bg-muted">
              <Search className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="text-[13px] font-bold">Chưa có chuyến đang thực hiện</div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              Khi có chuyến phù hợp, thông tin sẽ xuất hiện tại đây.
            </div>
          </div>
        )}
      </section>

      {/* ============ QUICK TOOLS ============ */}
      <section className="px-4 pt-4 pb-4">
        <h2 className="mb-2 px-1 text-[13px] font-bold">Công cụ nhanh</h2>
        <div className="grid grid-cols-2 gap-2">
          <ToolCard
            to="/driver/trips"
            Icon={History}
            label="Lịch sử chuyến"
            desc="Xem chuyến đã hoàn tất"
          />
          <ToolCard
            to="/driver/earnings"
            Icon={Wallet}
            label="Thu nhập"
            desc="Doanh thu & rút tiền"
          />
          <ToolCard to="/support" Icon={LifeBuoy} label="Báo sự cố" desc="Gặp vấn đề trên đường" />
          <ToolCard to="/support" Icon={PhoneCall} label="Liên hệ điều phối" desc="Hotline 24/7" />
        </div>
      </section>

      {showAssign && currentTrip && (
        <AssignmentSheet
          trip={currentTrip}
          countdown={countdown}
          onAccept={acceptTrip}
          onReject={rejectTrip}
        />
      )}
    </DriverShell>
  );
}

function useOnlineDuration(since: number | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!since) return;
    const t = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(t);
  }, [since]);
  if (!since) return "0g 0p";
  const min = Math.max(0, Math.floor((now - since) / 60000));
  const h = Math.floor(min / 60);
  return `${h}g ${min % 60}p`;
}

function StatCard({ label, value, Icon }: { label: string; value: string; Icon: typeof Star }) {
  return (
    <div className="rounded-2xl bg-surface border border-border p-3">
      <div className="flex items-center justify-between">
        <div className="text-[11px] text-muted-foreground">{label}</div>
        <Icon className="h-3.5 w-3.5 text-primary" />
      </div>
      <div className="mt-1.5 text-[17px] font-black leading-tight">{value}</div>
    </div>
  );
}

function ToolCard({
  to,
  Icon,
  label,
  desc,
}: {
  to: string;
  Icon: typeof Star;
  label: string;
  desc: string;
}) {
  return (
    <Link
      to={to as never}
      className="flex items-start gap-2.5 rounded-2xl bg-surface border border-border p-3 transition-colors hover:border-primary/40"
    >
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-bold leading-tight">{label}</div>
        <div className="mt-0.5 text-[11px] text-muted-foreground leading-tight">{desc}</div>
      </div>
    </Link>
  );
}

function AssignmentSheet({
  trip,
  countdown,
  onAccept,
  onReject,
}: {
  trip: TripRow;
  countdown: number;
  onAccept: () => void;
  onReject: () => void;
}) {
  const bookedAt = new Date(trip.created_at).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-t-3xl bg-background p-5 pb-8 shadow-elevated safe-bottom animate-in slide-in-from-bottom">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-muted" />
        <div className="flex items-center justify-between">
          <div>
            <div className="rounded-full bg-primary/15 px-3 py-1 text-[10px] font-black uppercase text-primary">
              Chuyến mới được gán
            </div>
            <h2 className="mt-2 text-lg font-black">Bạn vừa được gán một chuyến mới</h2>
            <div className="text-[11px] text-muted-foreground">
              Mã {trip.code} · Đặt lúc {bookedAt}
            </div>
          </div>
          <div className="grid h-16 w-16 place-items-center rounded-full border-4 border-primary text-xl font-black text-primary">
            {countdown}s
          </div>
        </div>

        <div className="mt-4 flex items-start gap-3 rounded-2xl bg-surface p-3">
          <div className="mt-1 flex flex-col items-center gap-1">
            <div className="h-2.5 w-2.5 rounded-full bg-primary" />
            <div className="h-8 w-px bg-border" />
            <div className="h-2.5 w-2.5 rounded-full bg-success" />
          </div>
          <div className="flex-1 space-y-3 text-xs">
            <div>
              <div className="text-[10px] uppercase text-muted-foreground">Điểm đón</div>
              <div className="text-sm font-bold">{trip.pickup_address}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-muted-foreground">
                Điểm đến · Chuyến {trip.distance_km != null ? formatKm(trip.distance_km) : "—"}
              </div>
              <div className="text-sm font-bold">{trip.dropoff_address}</div>
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between rounded-2xl bg-primary/10 p-3">
          <div>
            <div className="text-[10px] uppercase text-muted-foreground">Giá dự kiến</div>
            <div className="text-lg font-black text-primary">{formatVND(trip.price)}</div>
          </div>
          <div className="max-w-[55%] text-right text-[11px] text-muted-foreground">
            <span className="font-semibold text-foreground">Xe khách:</span> {trip.vehicle_type}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={onReject}
            className="rounded-2xl border border-border py-3.5 text-sm font-bold"
          >
            Không thể thực hiện
          </button>
          <button
            onClick={onAccept}
            className="rounded-2xl gradient-primary py-3.5 text-sm font-black text-primary-foreground shadow-glow"
          >
            Đã thấy — đi đón khách
          </button>
        </div>
      </div>
    </div>
  );
}

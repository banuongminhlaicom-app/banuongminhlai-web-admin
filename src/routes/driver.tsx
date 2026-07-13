import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Clock,
  DollarSign,
  Route as RouteIcon,
  Star,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { MapPreview } from "@/components/MapPreview";
import { DriverShell } from "@/components/DriverShell";
import { DEMO_TRIP, driverStore, useDriver } from "@/lib/driver-store";
import { formatVND } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/driver")({
  head: () => ({ meta: [{ title: "Tài xế — Bạn Uống Mình Lái" }] }),
  component: DriverHome,
});

const STATUS_LABEL: Record<string, { title: string; desc: string; tone: string }> = {
  offline: {
    title: "Đang ngoại tuyến",
    desc: "Bạn sẽ không nhận được chuyến mới.",
    tone: "bg-muted text-muted-foreground",
  },
  online: {
    title: "Trực tuyến — sẵn sàng nhận chuyến",
    desc: "Bạn đang trực tuyến và sẵn sàng nhận chuyến.",
    tone: "bg-success/15 text-success border-success/40",
  },
  assigned: {
    title: "Đã được gán chuyến",
    desc: "Xác nhận để bắt đầu đi đón khách.",
    tone: "bg-warning/15 text-warning border-warning/40",
  },
  going_to_pickup: {
    title: "Đang đến điểm đón",
    desc: "Di chuyển đến vị trí khách.",
    tone: "bg-primary/15 text-primary border-primary/40",
  },
  arrived: {
    title: "Đã tới điểm đón",
    desc: "Chờ gặp khách và nhập PIN.",
    tone: "bg-primary/15 text-primary border-primary/40",
  },
  met_customer: {
    title: "Đã gặp khách — nhập PIN",
    desc: "Xác nhận PIN để bắt đầu chuyến.",
    tone: "bg-primary/15 text-primary border-primary/40",
  },
  in_progress: {
    title: "Đang thực hiện chuyến",
    desc: "Chở khách đến điểm trả.",
    tone: "bg-primary/15 text-primary border-primary/40",
  },
  completed: {
    title: "Chuyến vừa hoàn tất",
    desc: "Cảm ơn bạn! Bấm Online để tiếp tục.",
    tone: "bg-success/15 text-success border-success/40",
  },
};

function DriverHome() {
  const s = useDriver();
  const navigate = useNavigate();
  const [showAssign, setShowAssign] = useState(false);
  const [countdown, setCountdown] = useState(20);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!s.authed) navigate({ to: "/driver/login" });
  }, [s.authed, navigate]);

  // Auto-assign simulation: after 5s online + autoAccept, show assignment.
  useEffect(() => {
    if (!s.online || !s.autoAccept) return;
    if (s.status !== "online") return;
    const t = window.setTimeout(() => {
      driverStore.set({ status: "assigned", currentTrip: DEMO_TRIP });
      setShowAssign(true);
      setCountdown(20);
    }, 5000);
    return () => window.clearTimeout(t);
  }, [s.online, s.autoAccept, s.status]);

  // If we already have an assignment (e.g. after reload) auto-open sheet.
  useEffect(() => {
    if (s.status === "assigned" && s.currentTrip) setShowAssign(true);
  }, [s.status, s.currentTrip]);

  // Countdown while sheet is open
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

  const handleTimeout = () => {
    setShowAssign(false);
    driverStore.set({ status: "online", currentTrip: null });
    toast("Chuyến đã được chuyển cho tài xế khác.", {
      description: "Xác nhận bạn vẫn sẵn sàng nhận chuyến.",
    });
  };

  const acceptTrip = () => {
    setShowAssign(false);
    driverStore.set({ status: "going_to_pickup" });
    toast.success("Đã nhận chuyến. Đi đón khách nào!");
    navigate({ to: "/driver/trips/$id", params: { id: DEMO_TRIP.id } });
  };

  const rejectTrip = () => {
    setShowAssign(false);
    driverStore.set({ status: "online", currentTrip: null });
    toast("Đã từ chối chuyến.");
  };

  const toggleOnline = () => {
    if (s.status !== "offline" && s.status !== "online" && s.status !== "completed") {
      toast.error("Không thể chuyển trạng thái khi đang có chuyến.");
      return;
    }
    const nextOnline = !s.online;
    driverStore.set({
      online: nextOnline,
      status: nextOnline ? "online" : "offline",
      onlineSince: nextOnline ? Date.now() : null,
    });
    toast(nextOnline ? "Bạn đang trực tuyến" : "Bạn đang ngoại tuyến");
  };

  const label = STATUS_LABEL[s.status];
  const onlineDuration = useOnlineDuration(s.onlineSince);

  return (
    <DriverShell>
      <div className="safe-top gradient-hero px-5 pt-3 pb-6">
        <div className="flex items-center justify-between">
          <Link to="/home" className="text-xs text-muted-foreground">
            ← Về khu khách hàng
          </Link>
          <Link
            to="/notifications"
            className="grid h-10 w-10 place-items-center rounded-full bg-surface"
          >
            <Bell className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <div className="grid h-14 w-14 place-items-center rounded-2xl gradient-primary text-lg font-black text-primary-foreground shadow-glow">
            TT
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs text-muted-foreground">Chào buổi tối,</div>
            <div className="text-lg font-black">Trần Minh Tuấn</div>
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-warning text-warning" />
                4.9
              </span>
              <span className="text-muted-foreground">· Hạng B2 · 328 chuyến</span>
            </div>
          </div>
        </div>

        <div
          className={cn(
            "mt-4 rounded-3xl border p-4",
            label.tone,
          )}
        >
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-black">{label.title}</div>
              <div className="mt-0.5 text-xs opacity-80">{label.desc}</div>
            </div>
            <button
              onClick={toggleOnline}
              aria-label="Bật/tắt trực tuyến"
              className={cn(
                "relative h-9 w-16 shrink-0 rounded-full transition",
                s.online ? "bg-success" : "bg-muted-foreground/40",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-8 w-8 rounded-full bg-white shadow-elevated transition-transform",
                  s.online ? "translate-x-7" : "translate-x-0.5",
                )}
              />
            </button>
          </div>

          <label className="mt-3 flex items-center justify-between rounded-2xl bg-background/60 px-3 py-2">
            <span className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <Zap className="h-3.5 w-3.5 text-primary" />
              Tự động nhận chuyến
            </span>
            <input
              type="checkbox"
              checked={s.autoAccept}
              onChange={(e) => driverStore.set({ autoAccept: e.target.checked })}
              className="h-4 w-4 accent-primary"
            />
          </label>
        </div>
      </div>

      <div className="-mt-4 px-5">
        <div className="grid grid-cols-2 gap-2">
          <StatCard label="Chuyến hôm nay" value={String(s.todayTrips)} Icon={RouteIcon} />
          <StatCard label="Doanh thu" value={formatVND(s.todayRevenue)} Icon={DollarSign} />
          <StatCard label="Thời gian online" value={onlineDuration} Icon={Clock} />
          <StatCard label="Đánh giá" value="4.9" Icon={Star} />
        </div>
      </div>

      <div className="mt-4 px-5">
        <div className="overflow-hidden rounded-3xl border border-border">
          <MapPreview className="h-52 w-full" showNearbyDrivers />
        </div>
      </div>

      {s.status !== "online" && s.status !== "offline" && s.currentTrip && (
        <div className="mt-4 px-5">
          <Link
            to="/driver/trips/$id"
            params={{ id: s.currentTrip.id }}
            className="flex items-center justify-between rounded-2xl gradient-primary p-4 text-sm font-bold text-primary-foreground shadow-glow"
          >
            <div>
              <div className="text-xs opacity-80">Chuyến hiện tại</div>
              <div>{s.currentTrip.code} → {s.currentTrip.dropoff}</div>
            </div>
            <span>Tiếp tục →</span>
          </Link>
        </div>
      )}

      {showAssign && s.currentTrip && (
        <AssignmentSheet
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
  if (!since) return "0h 0p";
  const min = Math.max(0, Math.floor((now - since) / 60000));
  const h = Math.floor(min / 60);
  return `${h}h ${min % 60}p`;
}

function StatCard({
  label,
  value,
  Icon,
}: {
  label: string;
  value: string;
  Icon: typeof Star;
}) {
  return (
    <div className="rounded-3xl bg-surface p-4 shadow-elevated">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">{label}</div>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="mt-2 text-xl font-black">{value}</div>
    </div>
  );
}

function AssignmentSheet({
  countdown,
  onAccept,
  onReject,
}: {
  countdown: number;
  onAccept: () => void;
  onReject: () => void;
}) {
  const t = DEMO_TRIP;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-t-3xl bg-background p-5 pb-8 shadow-elevated safe-bottom animate-in slide-in-from-bottom">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-muted" />
        <div className="flex items-center justify-between">
          <div>
            <div className="rounded-full bg-primary/15 px-3 py-1 text-[10px] font-black uppercase text-primary">
              Chuyến mới được gán
            </div>
            <h2 className="mt-2 text-lg font-black">
              Bạn vừa được gán một chuyến mới
            </h2>
            <div className="text-[11px] text-muted-foreground">
              Mã {t.code} · Đặt lúc {t.bookedAt}
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
              <div className="text-[10px] uppercase text-muted-foreground">
                Điểm đón · {t.pickupDistance.toFixed(1)}km từ bạn
              </div>
              <div className="text-sm font-bold">{t.pickup}</div>
              <div className="text-muted-foreground">{t.pickupAddress}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-muted-foreground">
                Điểm đến · Chuyến {t.tripDistance.toFixed(1)}km
              </div>
              <div className="text-sm font-bold">{t.dropoff}</div>
              <div className="text-muted-foreground">{t.dropoffAddress}</div>
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 rounded-2xl bg-surface p-3 text-center text-[11px]">
          <Cell label="Xe khách" value={t.vehicleType} />
          <Cell label="Hộp số" value={t.transmission} />
          <Cell label="Biển số" value={t.plate} />
        </div>

        <div className="mt-3 flex items-center justify-between rounded-2xl bg-primary/10 p-3">
          <div>
            <div className="text-[10px] uppercase text-muted-foreground">
              Giá dự kiến
            </div>
            <div className="text-lg font-black text-primary">
              {formatVND(t.price)}
            </div>
          </div>
          <div className="max-w-[55%] text-right text-[11px] text-muted-foreground">
            <span className="font-semibold text-foreground">Ghi chú:</span>{" "}
            {t.note}
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

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-xs font-black">{value}</div>
    </div>
  );
}

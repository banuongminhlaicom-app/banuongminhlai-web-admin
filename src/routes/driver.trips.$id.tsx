import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  MessageSquare,
  Navigation,
  Phone,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { MapPreview } from "@/components/MapPreview";
import { driverStore, useDriver } from "@/lib/driver-store";
import { formatKm, formatMinutes, formatVND } from "@/lib/format";

export const Route = createFileRoute("/driver/trips/$id")({
  head: () => ({ meta: [{ title: "Chuyến đi hiện tại" }] }),
  component: DriverTripDetail;
});

// TypeScript: fix stray semicolon workaround — actual component below.

function DriverTripDetail() {
  const { id } = Route.useParams();
  const s = useDriver();
  const navigate = useNavigate();
  const trip = s.currentTrip;
  const [pinOpen, setPinOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);

  useEffect(() => {
    if (!trip) navigate({ to: "/driver" });
  }, [trip, navigate]);

  const elapsed = useElapsed(s.status === "in_progress" ? trip?.startedAt ?? null : null);

  const cta = useMemo(() => {
    switch (s.status) {
      case "going_to_pickup":
        return { label: "Tôi đã đến điểm đón", next: "arrived" as const };
      case "arrived":
        return { label: "Xác nhận đã gặp khách", next: "met_customer" as const };
      case "met_customer":
        return { label: "Nhập mã PIN để bắt đầu", next: "PIN" as const };
      case "in_progress":
        return { label: "Hoàn thành chuyến đi", next: "SUMMARY" as const };
      case "assigned":
        return { label: "Bắt đầu đi đón khách", next: "going_to_pickup" as const };
      default:
        return null;
    }
  }, [s.status]);

  const handleCta = () => {
    if (!cta) return;
    if (cta.next === "PIN") {
      setPinOpen(true);
      return;
    }
    if (cta.next === "SUMMARY") {
      setSummaryOpen(true);
      return;
    }
    driverStore.set({ status: cta.next });
    toast.success(cta.label);
  };

  if (!trip) return null;

  const progress = ["going_to_pickup", "arrived", "met_customer", "in_progress"].indexOf(s.status);

  return (
    <div className="mx-auto min-h-[100dvh] max-w-md bg-background pb-10">
      <div className="relative">
        <MapPreview className="h-72 w-full" showRoute driverPin />
        <div className="safe-top absolute inset-x-0 top-0 flex items-center justify-between px-5 py-3">
          <button
            onClick={() => navigate({ to: "/driver" })}
            className="grid h-10 w-10 place-items-center rounded-full bg-surface/95 backdrop-blur"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="rounded-full bg-surface/95 px-3 py-1.5 text-xs font-bold backdrop-blur">
            {trip.code}
          </div>
        </div>
        <div className="absolute inset-x-5 bottom-3 rounded-2xl bg-surface/95 px-3 py-2 text-xs backdrop-blur">
          <div className="flex items-center justify-between">
            <span className="font-bold">
              {s.status === "in_progress"
                ? "Đang đưa khách về điểm đến"
                : s.status === "going_to_pickup"
                  ? "Đang đến điểm đón khách"
                  : s.status === "arrived"
                    ? "Đã tới điểm đón"
                    : s.status === "met_customer"
                      ? "Đã gặp khách — chờ PIN"
                      : "Chuẩn bị lên đường"}
            </span>
            <span className="text-muted-foreground">
              ETA {formatMinutes(s.status === "in_progress" ? 12 : 4)}
            </span>
          </div>
        </div>
      </div>

      <div className="-mt-4 space-y-3 rounded-t-3xl bg-background px-5 pt-5">
        <div className="rounded-3xl bg-surface p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-background text-lg font-black text-primary">
              {trip.customerName
                .split(" ")
                .slice(-2)
                .map((w) => w[0])
                .join("")}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-bold">{trip.customerName}</div>
              <div className="text-xs text-muted-foreground">
                {trip.customerPhoneMasked}
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

          <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border/60 pt-3 text-center text-[11px]">
            <Cell label="Xe khách" value={trip.vehicleType} />
            <Cell label="Hộp số" value={trip.transmission} />
            <Cell label="Biển số" value={trip.plate} />
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
                <div className="text-[10px] uppercase text-muted-foreground">
                  Điểm đón
                </div>
                <div className="text-sm font-bold">{trip.pickup}</div>
                <div className="text-muted-foreground">{trip.pickupAddress}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-muted-foreground">
                  Điểm đến · {formatKm(trip.tripDistance)}
                </div>
                <div className="text-sm font-bold">{trip.dropoff}</div>
                <div className="text-muted-foreground">{trip.dropoffAddress}</div>
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between rounded-2xl bg-background/60 p-3 text-xs">
            <span className="text-muted-foreground">Ghi chú của khách</span>
            <span className="ml-2 text-right font-semibold text-foreground">
              {trip.note}
            </span>
          </div>

          <div className="mt-3 flex items-center justify-between rounded-2xl bg-primary/10 p-3">
            <span className="text-xs text-muted-foreground">Giá chuyến</span>
            <span className="text-lg font-black text-primary">
              {formatVND(trip.price)}
            </span>
          </div>
        </div>

        {s.status === "in_progress" && (
          <div className="grid grid-cols-2 gap-2 rounded-3xl bg-surface p-4 text-center text-xs">
            <div>
              <div className="text-muted-foreground">Đã đi</div>
              <div className="mt-1 text-lg font-black">{elapsed}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Còn lại</div>
              <div className="mt-1 text-lg font-black">
                {formatKm(Math.max(0, trip.tripDistance - 1.4))}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 text-xs">
          <ActionBtn
            label="Chỉ đường"
            Icon={Navigation}
            onClick={() => toast("Mở Google Maps chỉ đường")}
          />
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

        {s.status !== "in_progress" && (
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

        {cta && (
          <button
            onClick={handleCta}
            className="mt-2 w-full rounded-2xl gradient-primary py-4 text-sm font-black uppercase tracking-wide text-primary-foreground shadow-glow"
          >
            {cta.label}
          </button>
        )}
      </div>

      {pinOpen && (
        <PinModal
          value={pin}
          onChange={setPin}
          onClose={() => {
            setPinOpen(false);
            setPin("");
          }}
          onSubmit={() => {
            if (pin !== trip.pin) {
              toast.error("Mã xác nhận không chính xác.");
              return;
            }
            driverStore.set({
              status: "in_progress",
              currentTrip: { ...trip, startedAt: Date.now() },
            });
            setPinOpen(false);
            setPin("");
            toast.success("PIN chính xác. Bắt đầu chuyến đi!");
          }}
        />
      )}

      {summaryOpen && (
        <SummarySheet
          onClose={() => setSummaryOpen(false)}
          onDone={(total) => {
            driverStore.set({
              status: "online",
              currentTrip: null,
              todayTrips: s.todayTrips + 1,
              todayRevenue: s.todayRevenue + total,
            });
            setSummaryOpen(false);
            toast.success("Đã hoàn thành chuyến đi!");
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

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-xs font-black">{value}</div>
    </div>
  );
}

function PinModal({
  value,
  onChange,
  onClose,
  onSubmit,
}: {
  value: string;
  onChange: (v: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl bg-background p-5 shadow-elevated">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black">Xác nhận mã PIN</h3>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full bg-surface"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Yêu cầu khách đọc mã PIN 4 số hiển thị trên ứng dụng để bắt đầu chuyến.
        </p>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 4))}
          inputMode="numeric"
          autoFocus
          className="mt-4 w-full rounded-2xl bg-surface px-4 py-4 text-center text-3xl font-black tracking-[0.6em] outline-none"
          placeholder="••••"
        />
        <p className="mt-2 text-center text-[10px] text-muted-foreground">
          Demo: 2684
        </p>
        <button
          onClick={onSubmit}
          disabled={value.length !== 4}
          className="mt-4 w-full rounded-2xl gradient-primary py-3.5 text-sm font-black text-primary-foreground shadow-glow disabled:opacity-50"
        >
          Xác nhận & Bắt đầu chuyến
        </button>
      </div>
    </div>
  );
}

function SummarySheet({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: (total: number) => void;
}) {
  const trip = useDriver().currentTrip!;
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
          <Row label="Điểm đón" value={trip.pickup} />
          <Row label="Điểm đến" value={trip.dropoff} />
          <Row label="Quãng đường" value={formatKm(trip.tripDistance)} />
          <Row label="Thời gian chuyến" value={formatMinutes(24)} />
          <Row label="Thời gian chờ" value={formatMinutes(5)} />
          <div className="my-2 border-t border-border/60" />
          <Row label="Giá dự kiến" value={formatVND(trip.price)} />
          <Row label="Phụ phí chờ" value={formatVND(surcharge)} />
          <Row
            label="Tổng tiền"
            value={formatVND(total)}
            emphasize
          />
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
          onClick={() => onDone(total)}
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

function Row({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={emphasize ? "font-bold" : "text-muted-foreground"}>
        {label}
      </span>
      <span className={emphasize ? "text-base font-black text-primary" : "font-semibold"}>
        {value}
      </span>
    </div>
  );
}

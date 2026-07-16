import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  Loader2,
  MessageSquare,
  Navigation,
  Phone,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { MapPreview } from "@/components/MapPreview";
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
              {driverStatus === "in_progress"
                ? "Đang đưa khách về điểm đến"
                : driverStatus === "going_to_pickup"
                  ? "Đang đến điểm đón khách"
                  : driverStatus === "arrived"
                    ? "Đã tới điểm đón"
                    : driverStatus === "met_customer"
                      ? "Đã gặp khách — chờ PIN"
                      : "Chuẩn bị lên đường"}
            </span>
            <span className="text-muted-foreground">
              ETA {formatMinutes(driverStatus === "in_progress" ? 12 : 4)}
            </span>
          </div>
        </div>
      </div>

      <div className="-mt-4 space-y-3 rounded-t-3xl bg-background px-5 pt-5">
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
              <span className="ml-2 text-right font-semibold text-foreground">{trip.note}</span>
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

        <div className="grid grid-cols-3 gap-2 text-xs">
          <ActionBtn
            label="Chỉ đường"
            Icon={Navigation}
            onClick={() => toast("Mở Google Maps chỉ đường")}
          />
          <ActionBtn label="Báo sự cố" Icon={AlertTriangle} onClick={() => setIssueOpen(true)} />
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

        {cta && (
          <button
            onClick={handleCta}
            className="mt-2 w-full rounded-2xl gradient-primary py-4 text-sm font-black uppercase tracking-wide text-primary-foreground shadow-glow"
          >
            {cta.label}
          </button>
        )}
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

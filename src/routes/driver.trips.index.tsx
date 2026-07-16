import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ChevronRight, Route as RouteIcon } from "lucide-react";
import { DriverShell } from "@/components/DriverShell";
import { useAuthState, useRequireRole } from "@/lib/auth";
import { getDriverSelf, getTrip } from "@/lib/queries";
import { formatVND } from "@/lib/format";

export const Route = createFileRoute("/driver/trips/")({
  head: () => ({ meta: [{ title: "Chuyến đi của tài xế" }] }),
  component: DriverTrips,
});

// Lịch sử chuyến đã hoàn tất vẫn là dữ liệu minh hoạ — thống kê chuyến thật
// theo tài xế chưa nằm trong phạm vi hiện tại.
const HISTORY = [
  {
    id: "8798",
    code: "BUML-8798",
    route: "P.1 → P. Hòa Thuận",
    price: 245000,
    time: "23:10 hôm qua",
  },
  {
    id: "8790",
    code: "BUML-8790",
    route: "Phú Hòa → Mỹ Phú",
    price: 115000,
    time: "21:40 hôm qua",
  },
  {
    id: "8781",
    code: "BUML-8781",
    route: "TP Sa Đéc → Cao Lãnh",
    price: 380000,
    time: "22:20, 11/07",
  },
  { id: "8770", code: "BUML-8770", route: "P.2 → P.4", price: 100000, time: "20:00, 10/07" },
];

const ACTIVE_STATUSES = ["assigned", "going_to_pickup", "arrived", "met_customer", "in_progress"];

function DriverTrips() {
  useRequireRole("driver");
  const authState = useAuthState();
  const driverId = authState.session?.user.id;

  const { data: driverSelf } = useQuery({
    queryKey: ["driver-self", driverId],
    queryFn: () => getDriverSelf(driverId!),
    enabled: !!driverId,
  });
  const currentTripId = driverSelf?.current_trip_id ?? null;
  const { data: currentTrip } = useQuery({
    queryKey: ["trip", currentTripId],
    queryFn: () => getTrip(currentTripId!),
    enabled: !!currentTripId,
  });

  const hasActive = Boolean(
    currentTrip && driverSelf && ACTIVE_STATUSES.includes(driverSelf.status),
  );

  return (
    <DriverShell>
      <div className="safe-top flex items-center gap-3 px-5 py-3">
        <Link to="/driver" className="grid h-10 w-10 place-items-center rounded-full bg-surface">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-black">Chuyến đi</h1>
      </div>

      {hasActive && currentTrip && driverSelf && (
        <div className="mx-5">
          <div className="text-xs font-semibold uppercase text-muted-foreground">
            Đang thực hiện
          </div>
          <Link
            to="/driver/trips/$id"
            params={{ id: currentTrip.id }}
            className="mt-2 flex items-center justify-between rounded-2xl gradient-primary p-4 text-primary-foreground shadow-glow"
          >
            <div>
              <div className="text-xs opacity-80">{currentTrip.code}</div>
              <div className="text-sm font-bold">
                {currentTrip.pickup_address} → {currentTrip.dropoff_address}
              </div>
              <div className="text-[11px] opacity-80">
                Trạng thái: {driverSelf.status.replaceAll("_", " ")}
              </div>
            </div>
            <ChevronRight className="h-5 w-5" />
          </Link>
        </div>
      )}

      <h2 className="mb-2 mt-6 px-5 text-sm font-bold">Lịch sử chuyến</h2>
      <div className="mx-5 divide-y divide-border/60 overflow-hidden rounded-2xl bg-surface">
        {HISTORY.map((h) => (
          <div key={h.id} className="flex items-center gap-3 p-4">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-background text-primary">
              <RouteIcon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold">{h.code}</div>
              <div className="truncate text-xs text-muted-foreground">{h.route}</div>
              <div className="text-[11px] text-muted-foreground">{h.time}</div>
            </div>
            <div className="text-sm font-black text-success">+{formatVND(h.price)}</div>
          </div>
        ))}
      </div>

      {!hasActive && (
        <div className="mx-5 mt-6 rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
          Chưa có chuyến đang thực hiện. Bật Online để bắt đầu nhận chuyến.
        </div>
      )}
    </DriverShell>
  );
}

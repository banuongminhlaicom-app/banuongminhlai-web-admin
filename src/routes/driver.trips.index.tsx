import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight, Route as RouteIcon } from "lucide-react";
import { DriverShell } from "@/components/DriverShell";
import { useDriver } from "@/lib/driver-store";
import { formatVND } from "@/lib/format";

export const Route = createFileRoute("/driver/trips/")({
  head: () => ({ meta: [{ title: "Chuyến đi của tài xế" }] }),
  component: DriverTrips,
});

const HISTORY = [
  { id: "8798", code: "BUML-8798", route: "P.1 → P. Hòa Thuận", price: 245000, time: "23:10 hôm qua" },
  { id: "8790", code: "BUML-8790", route: "Phú Hòa → Mỹ Phú", price: 115000, time: "21:40 hôm qua" },
  { id: "8781", code: "BUML-8781", route: "TP Sa Đéc → Cao Lãnh", price: 380000, time: "22:20, 11/07" },
  { id: "8770", code: "BUML-8770", route: "P.2 → P.4", price: 100000, time: "20:00, 10/07" },
];

function DriverTrips() {
  const s = useDriver();
  const current = s.currentTrip;
  const activeStatuses = ["assigned", "going_to_pickup", "arrived", "met_customer", "in_progress"];
  const hasActive = current && activeStatuses.includes(s.status);

  return (
    <DriverShell>
      <div className="safe-top flex items-center gap-3 px-5 py-3">
        <Link to="/driver" className="grid h-10 w-10 place-items-center rounded-full bg-surface">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-black">Chuyến đi</h1>
      </div>

      {hasActive && current && (
        <div className="mx-5">
          <div className="text-xs font-semibold uppercase text-muted-foreground">
            Đang thực hiện
          </div>
          <Link
            to="/driver/trips/$id"
            params={{ id: current.id }}
            className="mt-2 flex items-center justify-between rounded-2xl gradient-primary p-4 text-primary-foreground shadow-glow"
          >
            <div>
              <div className="text-xs opacity-80">{current.code}</div>
              <div className="text-sm font-bold">
                {current.pickup} → {current.dropoff}
              </div>
              <div className="text-[11px] opacity-80">
                Trạng thái: {s.status.replaceAll("_", " ")}
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
            <div className="text-sm font-black text-success">
              +{formatVND(h.price)}
            </div>
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

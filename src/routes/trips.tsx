import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { MOCK_TRIPS, TRIP_STATUS_LABEL, type TripStatus } from "@/lib/mock";
import { formatKm, formatVND } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/trips")({
  head: () => ({ meta: [{ title: "Chuyến đi" }] }),
  component: TripsScreen,
});

const TABS = [
  { key: "active", label: "Đang diễn ra", filter: (s: TripStatus) => ["searching", "accepted", "arriving", "arrived", "in_progress"].includes(s) },
  { key: "upcoming", label: "Sắp tới", filter: () => false },
  { key: "history", label: "Lịch sử", filter: (s: TripStatus) => s === "completed" },
  { key: "cancelled", label: "Đã hủy", filter: (s: TripStatus) => s === "cancelled" },
] as const;

function TripsScreen() {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("history");
  const filtered = MOCK_TRIPS.filter((t) => TABS.find((x) => x.key === tab)!.filter(t.status));

  return (
    <MobileShell>
      <div className="safe-top px-5 pt-3">
        <h1 className="text-2xl font-black">Chuyến đi của tôi</h1>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto no-scrollbar px-5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-xs font-bold transition",
              tab === t.key ? "gradient-primary text-primary-foreground shadow-glow" : "bg-surface text-muted-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-2 px-5">
        {filtered.length === 0 ? (
          <div className="mt-16 text-center">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-surface text-3xl">📭</div>
            <div className="mt-4 text-sm font-bold">Chưa có chuyến nào</div>
            <div className="mt-1 text-xs text-muted-foreground">Các chuyến {TABS.find((x) => x.key === tab)!.label.toLowerCase()} sẽ hiển thị tại đây.</div>
            <Link to="/booking" className="mt-6 inline-block rounded-full gradient-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-glow">
              Đặt chuyến mới
            </Link>
          </div>
        ) : (
          filtered.map((t) => (
            <Link
              key={t.id}
              to="/booking/$id"
              params={{ id: t.code.replace("BUML-", "") }}
              className="block rounded-3xl bg-surface p-4"
            >
              <div className="flex items-start justify-between">
                <div className="text-[10px] uppercase text-muted-foreground">{t.code}</div>
                <span className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-bold",
                  t.status === "completed" && "bg-success/20 text-success",
                  t.status === "cancelled" && "bg-destructive/20 text-destructive",
                  !["completed", "cancelled"].includes(t.status) && "bg-primary/20 text-primary",
                )}>
                  {TRIP_STATUS_LABEL[t.status]}
                </span>
              </div>
              <div className="mt-2 flex items-start gap-2">
                <div className="mt-1 flex flex-col items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <div className="h-4 w-px bg-border" />
                  <div className="h-2 w-2 rounded-full bg-success" />
                </div>
                <div className="min-w-0 flex-1 text-sm">
                  <div className="truncate font-semibold">{t.pickup}</div>
                  <div className="mt-1 truncate font-semibold">{t.destination}</div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs">
                <span className="text-muted-foreground">{formatKm(t.distanceKm)} · {t.vehicleType}</span>
                <span className="text-base font-black text-primary">{formatVND(t.price)}</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </MobileShell>
  );
}

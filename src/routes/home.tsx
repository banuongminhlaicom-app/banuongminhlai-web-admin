import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, MapPin, Search, ShieldAlert, Zap, CalendarClock, Loader2 } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { MapPreview } from "@/components/MapPreview";
import { EmergencyButton } from "@/components/EmergencyButton";
import { BrandLogo } from "@/components/BrandLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LocationPermissionCard } from "@/components/LocationPermissionCard";
import { useAuthState, useRequireRole } from "@/lib/auth";
import { getAddresses } from "@/lib/queries";

export const Route = createFileRoute("/home")({
  head: () => ({ meta: [{ title: "Trang chủ — Bạn Uống Mình Lái" }] }),
  component: HomeScreen,
});

function HomeScreen() {
  useRequireRole("customer");
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const authState = useAuthState();
  const userId = authState.session?.user.id;
  const { data: savedAddresses = [] } = useQuery({
    queryKey: ["addresses", userId],
    queryFn: () => getAddresses(userId!),
    enabled: !!userId,
  });

  const goBook = (to: "/booking" | "/schedule") => {
    if (to === "/booking") setLoading(true);
    setTimeout(() => navigate({ to }), to === "/booking" ? 350 : 0);
  };

  return (
    <MobileShell>
      {/* Header */}
      <header className="safe-top px-4 pt-2 pb-2">
        <div className="flex items-center justify-between">
          <BrandLogo size="sm" />
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <button
              onClick={() => navigate({ to: "/notifications" })}
              className="relative grid h-10 w-10 place-items-center rounded-full bg-surface"
              aria-label="Thông báo"
            >
              <Bell className="h-[18px] w-[18px]" />
              <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
            </button>
          </div>
        </div>
      </header>

      {/* Mời bật định vị nếu chưa cấp quyền — tự ẩn khi đã cho phép. */}
      <div className="px-4 pb-2">
        <LocationPermissionCard role="customer" />
      </div>

      {/* Map with floating bottom sheet */}
      <section className="relative px-4">
        <div className="relative h-[240px] overflow-hidden rounded-3xl border border-border shadow-elevated">
          <MapPreview className="h-full w-full" showNearbyDrivers />

          {/* Location chip */}
          <div className="absolute left-3 top-3 flex max-w-[85%] items-center gap-1.5 rounded-full bg-background/90 px-3 py-1.5 text-[12px] shadow-elevated backdrop-blur">
            <MapPin className="h-3.5 w-3.5 text-primary" />
            <span className="truncate">
              <span className="text-muted-foreground">Vị trí:</span>{" "}
              <span className="font-semibold">Phường 1, Cao Lãnh</span>
            </span>
          </div>

          {/* Drivers badge */}
          <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-background/90 px-2.5 py-1.5 text-[11px] font-semibold shadow-elevated backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
            12 tài xế gần bạn
          </div>
        </div>

        {/* Floating bottom sheet — overlaps map by ~20px */}
        <div className="relative z-10 -mt-5 rounded-3xl bg-surface p-4 shadow-elevated ring-1 ring-border">
          <button
            onClick={() => goBook("/booking")}
            className="flex w-full items-center gap-3 rounded-2xl bg-background/70 p-3 text-left transition active:scale-[.99]"
          >
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/15">
              <Search className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Điểm đón
              </div>
              <div className="truncate text-[14px] font-semibold">Tài xế sẽ đến đón bạn ở đâu?</div>
            </div>
          </button>

          <div className="my-2 ml-[30px] h-3 w-px bg-border" />

          <button
            onClick={() => goBook("/booking")}
            className="flex w-full items-center gap-3 rounded-2xl bg-background/70 p-3 text-left transition active:scale-[.99]"
          >
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-success/15">
              <MapPin className="h-4 w-4 text-success" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Điểm đến
              </div>
              <div className="truncate text-[14px] font-semibold text-muted-foreground">
                Bạn muốn về đâu?
              </div>
            </div>
          </button>

          <div className="mt-3 grid grid-cols-5 gap-2">
            <button
              onClick={() => goBook("/booking")}
              disabled={loading}
              className="col-span-3 flex items-center justify-center gap-2 rounded-2xl gradient-primary py-3.5 text-[14px] font-bold text-primary-foreground shadow-glow transition active:scale-[.98] disabled:opacity-90"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Đang tìm...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" /> ĐẶT TÀI XẾ NGAY
                </>
              )}
            </button>
            <button
              onClick={() => goBook("/schedule")}
              className="col-span-2 flex items-center justify-center gap-1.5 rounded-2xl border border-border bg-background/50 py-3.5 text-[13px] font-bold transition active:scale-[.98]"
            >
              <CalendarClock className="h-4 w-4" /> ĐẶT LỊCH
            </button>
          </div>
        </div>
      </section>

      {/* Saved addresses — horizontal scroll */}
      <section className="mt-4 px-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-[14px] font-bold">Địa chỉ đã lưu</h3>
          <button
            onClick={() => navigate({ to: "/addresses" })}
            className="text-[12px] font-semibold text-primary"
          >
            Xem tất cả
          </button>
        </div>
        {savedAddresses.length === 0 ? (
          <button
            onClick={() => navigate({ to: "/addresses" })}
            className="w-full rounded-2xl border border-dashed border-border bg-surface/60 p-4 text-left text-[13px] text-muted-foreground"
          >
            Chưa có địa chỉ đã lưu. Bấm để thêm địa chỉ đầu tiên.
          </button>
        ) : (
          <div className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-px-4 px-4 pb-1 no-scrollbar">
            {savedAddresses.map((a) => (
              <button
                key={a.id}
                onClick={() => goBook("/booking")}
                className="flex w-[220px] shrink-0 snap-start items-start gap-2.5 rounded-2xl bg-surface p-3 text-left shadow-elevated ring-1 ring-border"
              >
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-background text-lg">
                  {a.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-semibold">{a.label}</div>
                  <div className="truncate text-[12px] text-muted-foreground">{a.address}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Safety banner */}
      <section className="mt-3 px-4">
        <div className="flex items-center gap-3 rounded-2xl border border-primary/25 bg-primary/10 p-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/20">
            <ShieldAlert className="h-[18px] w-[18px] text-primary" />
          </div>
          <div className="min-w-0">
            <div className="text-[14px] font-bold leading-tight">Đã uống — Đừng lái</div>
            <div className="text-[12px] text-muted-foreground">
              Bạn cứ vui, việc lái xe để chúng tôi lo.
            </div>
          </div>
        </div>
      </section>

      <EmergencyButton />
    </MobileShell>
  );
}

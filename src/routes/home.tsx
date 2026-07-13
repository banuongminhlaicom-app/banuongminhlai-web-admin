import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, MapPin, Search, ShieldAlert, Star, Zap, Calendar as CalIcon } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { MapPreview } from "@/components/MapPreview";
import { EmergencyButton } from "@/components/EmergencyButton";
import { BrandLogo } from "@/components/BrandLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { greetingByHour } from "@/lib/format";
import { SAVED_ADDRESSES } from "@/lib/mock";

export const Route = createFileRoute("/home")({
  head: () => ({ meta: [{ title: "Trang chủ — Bạn Uống Mình Lái" }] }),
  component: HomeScreen,
});

function HomeScreen() {
  return (
    <MobileShell>
      <div className="safe-top px-5 pt-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandLogo size="sm" showText={false} />
            <div>
              <div className="text-xs text-muted-foreground">{greetingByHour()},</div>
              <div className="text-sm font-bold">Nguyễn Văn An</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link to="/notifications" className="relative grid h-10 w-10 place-items-center rounded-full bg-surface">
              <Bell className="h-5 w-5" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary" />
            </Link>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 text-primary" />
          <span>Vị trí hiện tại: <span className="text-foreground font-medium">Phường 1, Cao Lãnh</span></span>
        </div>
      </div>

      {/* Map card */}
      <div className="mt-4 px-5">
        <div className="relative overflow-hidden rounded-3xl border border-border shadow-elevated">
          <MapPreview className="h-56 w-full" />
          <div className="absolute inset-x-3 bottom-3 rounded-2xl bg-surface/95 p-3 backdrop-blur-xl">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Star className="h-3.5 w-3.5 fill-warning text-warning" />
              <span>12 tài xế sẵn sàng gần bạn</span>
            </div>
          </div>
        </div>
      </div>

      {/* Booking card */}
      <div className="mt-4 px-5">
        <div className="rounded-3xl bg-surface p-4 shadow-elevated">
          <Link to="/booking" className="flex items-center gap-3 rounded-2xl bg-background/60 p-3.5">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/15">
              <Search className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <div className="text-[11px] uppercase text-muted-foreground">Điểm đón</div>
              <div className="text-sm font-semibold">Tài xế sẽ đến đón bạn ở đâu?</div>
            </div>
          </Link>

          <Link to="/booking" className="mt-2 flex items-center gap-3 rounded-2xl bg-background/60 p-3.5">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-success/15">
              <MapPin className="h-4 w-4 text-success" />
            </div>
            <div className="flex-1">
              <div className="text-[11px] uppercase text-muted-foreground">Điểm đến</div>
              <div className="text-sm font-semibold text-muted-foreground">Bạn muốn về đâu?</div>
            </div>
          </Link>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link to="/booking" className="flex items-center justify-center gap-2 rounded-2xl gradient-primary py-3.5 text-sm font-bold text-primary-foreground shadow-glow active:scale-[.98] transition">
              <Zap className="h-4 w-4" /> ĐẶT TÀI XẾ NGAY
            </Link>
            <Link to="/schedule" className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-background/40 py-3.5 text-sm font-bold active:scale-[.98] transition">
              <CalIcon className="h-4 w-4" /> ĐẶT LỊCH TRƯỚC
            </Link>
          </div>
        </div>
      </div>

      {/* Saved addresses */}
      <div className="mt-6 px-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold">Địa chỉ đã lưu</h3>
          <Link to="/addresses" className="text-xs font-semibold text-primary">Xem tất cả</Link>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5">
          {SAVED_ADDRESSES.map((a) => (
            <Link
              key={a.id}
              to="/booking"
              className="flex min-w-[160px] items-start gap-2.5 rounded-2xl bg-surface p-3"
            >
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-background text-lg">{a.icon}</div>
              <div className="min-w-0">
                <div className="text-sm font-semibold">{a.label}</div>
                <div className="truncate text-[11px] text-muted-foreground">{a.address}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Safety banner */}
      <div className="mt-6 px-5">
        <div className="flex items-center gap-3 rounded-3xl border border-primary/30 bg-primary/10 p-4">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/20">
            <ShieldAlert className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold">Đã uống rượu bia — Không tự lái xe</div>
            <div className="text-xs text-muted-foreground">Bạn cứ vui, việc lái xe để chúng tôi lo.</div>
          </div>
        </div>
      </div>

      <EmergencyButton />
    </MobileShell>
  );
}

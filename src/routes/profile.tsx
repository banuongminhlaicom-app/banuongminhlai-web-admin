import { createFileRoute, Link } from "@tanstack/react-router";
import { Car, ChevronRight, CreditCard, Headphones, LogOut, MapPin, Shield, Star, User, Wallet } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { toast } from "sonner";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Tài khoản" }] }),
  component: Profile,
});

const ITEMS = [
  { label: "Ví & thanh toán", Icon: Wallet, to: "/wallet" },
  { label: "Phương tiện của tôi", Icon: Car, to: "/vehicles" },
  { label: "Địa chỉ đã lưu", Icon: MapPin, to: "/addresses" },
  { label: "Phương thức thanh toán", Icon: CreditCard, to: "/wallet" },
  { label: "Trung tâm hỗ trợ", Icon: Headphones, to: "/support" },
  { label: "Điều khoản & bảo mật", Icon: Shield, to: "/terms" },
] as const;

function Profile() {
  return (
    <MobileShell>
      <div className="safe-top px-5 pt-3">
        <div className="rounded-3xl bg-surface p-5 shadow-elevated">
          <div className="flex items-center gap-3">
            <div className="grid h-16 w-16 place-items-center rounded-2xl gradient-primary text-xl font-black text-primary-foreground shadow-glow">NA</div>
            <div className="min-w-0 flex-1">
              <div className="text-lg font-black">Nguyễn Văn An</div>
              <div className="text-xs text-muted-foreground">+84 901 234 567</div>
              <div className="mt-1 flex items-center gap-1 text-xs">
                <Star className="h-3 w-3 fill-warning text-warning" />
                <span className="font-bold">4.9</span>
                <span className="text-muted-foreground">· 14 chuyến</span>
              </div>
            </div>
            <button className="grid h-9 w-9 place-items-center rounded-full bg-background">
              <User className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-4 text-center">
            <Stat label="Chuyến" value="14" />
            <Stat label="Điểm" value="230" />
            <Stat label="Ưu đãi" value="3" />
          </div>
        </div>
      </div>

      <div className="mt-4 px-5">
        <div className="overflow-hidden rounded-3xl bg-surface">
          {ITEMS.map(({ label, Icon, to }) => (
            <Link key={label} to={to} className="flex items-center gap-3 border-b border-border/60 p-4 last:border-b-0 active:bg-background/30">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-background text-primary"><Icon className="h-4 w-4" /></div>
              <div className="flex-1 text-sm font-semibold">{label}</div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-4 px-5">
        <Link to="/driver" className="flex items-center gap-3 rounded-3xl border border-primary/30 bg-primary/10 p-4">
          <div className="grid h-11 w-11 place-items-center rounded-2xl gradient-primary text-xl">🚗</div>
          <div className="flex-1">
            <div className="text-sm font-bold">Trở thành tài xế</div>
            <div className="text-xs text-muted-foreground">Kiếm thêm thu nhập cùng Bạn Uống Mình Lái</div>
          </div>
          <ChevronRight className="h-4 w-4 text-primary" />
        </Link>
      </div>

      <div className="mt-4 px-5">
        <Link to="/admin" className="block rounded-2xl bg-surface p-3 text-center text-xs font-semibold text-muted-foreground">
          Vào khu vực quản trị viên →
        </Link>
      </div>

      <div className="mt-4 px-5">
        <button onClick={() => toast("Đã đăng xuất (demo)")} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border py-3 text-sm font-bold text-destructive">
          <LogOut className="h-4 w-4" /> Đăng xuất
        </button>
      </div>
      <div className="mt-3 px-5 text-center text-[10px] text-muted-foreground">Phiên bản 0.1.0 · Cao Lãnh, Đồng Tháp</div>
    </MobileShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-lg font-black text-primary">{value}</div>
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
    </div>
  );
}

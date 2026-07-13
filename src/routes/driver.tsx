import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Bell, ChevronRight, DollarSign, Route as RouteIcon, Star, TrendingUp, User } from "lucide-react";
import { MapPreview } from "@/components/MapPreview";
import { formatVND } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/driver")({
  head: () => ({ meta: [{ title: "Tài xế — Bạn Uống Mình Lái" }] }),
  component: DriverHome,
});

function DriverHome() {
  const [online, setOnline] = useState(true);
  const navigate = useNavigate();

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background pb-32">
      <div className="safe-top gradient-hero px-5 pt-3 pb-6">
        <div className="flex items-center justify-between">
          <Link to="/home" className="text-xs text-muted-foreground">← Về khu khách hàng</Link>
          <Link to="/notifications" className="grid h-10 w-10 place-items-center rounded-full bg-surface"><Bell className="h-4 w-4" /></Link>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <div className="grid h-14 w-14 place-items-center rounded-2xl gradient-primary text-lg font-black text-primary-foreground shadow-glow">TT</div>
          <div className="min-w-0 flex-1">
            <div className="text-lg font-black">Trần Minh Tuấn</div>
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1"><Star className="h-3 w-3 fill-warning text-warning" />4.9</span>
              <span className="text-muted-foreground">· Hạng B2 · 328 chuyến</span>
            </div>
          </div>
        </div>

        <div className={cn(
          "mt-4 flex items-center justify-between rounded-3xl border p-4",
          online ? "border-success/40 bg-success/10" : "border-border bg-surface",
        )}>
          <div>
            <div className="text-sm font-bold">{online ? "Đang trực tuyến" : "Đang ngoại tuyến"}</div>
            <div className="text-xs text-muted-foreground">{online ? "Bạn có thể nhận chuyến mới" : "Bật để bắt đầu nhận chuyến"}</div>
          </div>
          <button
            onClick={() => setOnline((v) => !v)}
            className={cn(
              "relative h-8 w-14 rounded-full transition",
              online ? "bg-success" : "bg-muted",
            )}
          >
            <span className={cn("absolute top-0.5 h-7 w-7 rounded-full bg-white transition-transform", online ? "translate-x-6" : "translate-x-0.5")} />
          </button>
        </div>
      </div>

      <div className="-mt-4 px-5">
        <div className="grid grid-cols-2 gap-2">
          <StatCard label="Chuyến hôm nay" value="7" Icon={RouteIcon} />
          <StatCard label="Doanh thu" value={formatVND(890000)} Icon={DollarSign} />
          <StatCard label="Tỷ lệ nhận" value="92%" Icon={TrendingUp} />
          <StatCard label="Đánh giá" value="4.9" Icon={Star} />
        </div>
      </div>

      <div className="mt-4 px-5">
        <div className="overflow-hidden rounded-3xl border border-border">
          <MapPreview className="h-48 w-full" />
        </div>
      </div>

      <div className="mt-4 px-5">
        <button
          onClick={() => navigate({ to: "/driver/requests" })}
          className="w-full rounded-2xl gradient-primary py-4 text-sm font-bold text-primary-foreground shadow-glow"
        >
          Xem yêu cầu chuyến (Demo)
        </button>
      </div>

      <div className="mt-4 space-y-2 px-5">
        <DriverLink to="/driver/earnings" label="Thu nhập" desc="Xem doanh thu và lịch sử giao dịch" Icon={DollarSign} />
        <DriverLink to="/driver/profile" label="Hồ sơ tài xế" desc="Giấy phép, CMND, trạng thái xét duyệt" Icon={User} />
        <button
          onClick={() => toast.error("Đã gửi cảnh báo tới tổng đài")}
          className="flex w-full items-center gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-3 text-left"
        >
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-destructive/20 text-destructive">SOS</div>
          <div className="flex-1">
            <div className="text-sm font-bold text-destructive">Hỗ trợ khẩn cấp</div>
            <div className="text-xs text-muted-foreground">Liên hệ tổng đài an toàn</div>
          </div>
        </button>
      </div>
    </div>
  );
}

function StatCard({ label, value, Icon }: { label: string; value: string; Icon: typeof Star }) {
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

function DriverLink({ to, label, desc, Icon }: { to: string; label: string; desc: string; Icon: typeof Star }) {
  return (
    <Link to={to} className="flex items-center gap-3 rounded-2xl bg-surface p-3">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-background text-primary"><Icon className="h-4 w-4" /></div>
      <div className="flex-1">
        <div className="text-sm font-bold">{label}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}

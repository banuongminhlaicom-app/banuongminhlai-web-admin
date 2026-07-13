import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, MessageSquare, Phone, ShieldAlert, Star, X } from "lucide-react";
import { MapPreview } from "@/components/MapPreview";
import { MOCK_DRIVERS, TRIP_STATUS_LABEL, type TripStatus } from "@/lib/mock";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/booking/$id")({
  component: BookingDetail,
});

const FLOW: TripStatus[] = ["accepted", "arriving", "arrived", "in_progress", "completed"];

function BookingDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const driver = MOCK_DRIVERS[0];
  const [statusIdx, setStatusIdx] = useState(0);
  const status = FLOW[statusIdx];
  const isFinal = status === "completed";

  const advance = () => {
    if (statusIdx < FLOW.length - 1) setStatusIdx((i) => i + 1);
  };

  return (
    <div className="relative mx-auto min-h-screen max-w-md bg-background">
      <MapPreview className="h-[55vh] w-full" showRoute driverPin />

      <div className="safe-top absolute inset-x-0 top-0 flex items-center justify-between px-5 py-3">
        <button onClick={() => history.back()} className="grid h-10 w-10 place-items-center rounded-full bg-surface/95 backdrop-blur">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="rounded-full bg-surface/95 px-3 py-1.5 text-xs font-bold backdrop-blur">
          Mã: BUML-{id}
        </div>
      </div>

      <div className="-mt-8 rounded-t-3xl bg-background px-5 pt-5 pb-32">
        {/* Status pill */}
        <div className={cn(
          "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold",
          isFinal ? "bg-success/20 text-success" : "bg-primary/20 text-primary",
        )}>
          <span className={cn("h-2 w-2 rounded-full", isFinal ? "bg-success" : "bg-primary animate-pulse")} />
          {TRIP_STATUS_LABEL[status]}
        </div>

        {/* Driver card */}
        <div className="mt-3 rounded-3xl bg-surface p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-14 w-14 place-items-center rounded-2xl gradient-primary text-lg font-black text-primary-foreground shadow-glow">
              {driver.avatar}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-base font-bold">{driver.name}</div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Star className="h-3 w-3 fill-warning text-warning" /> {driver.rating}</span>
                <span>· {driver.trips} chuyến</span>
                <span>· {driver.yearsExperience} năm KN</span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">SĐT: {driver.phone}</div>
            </div>
            {!isFinal && (
              <div className="text-right">
                <div className="text-[10px] uppercase text-muted-foreground">Đến sau</div>
                <div className="text-xl font-black text-primary">{driver.etaMinutes}p</div>
              </div>
            )}
          </div>

          {!isFinal && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              <ActionBtn Icon={Phone} label="Gọi" onClick={() => toast("Đang gọi tài xế...")} />
              <ActionBtn Icon={MessageSquare} label="Nhắn tin" onClick={() => toast("Mở khung chat")} />
              <ActionBtn Icon={ShieldAlert} label="Khẩn cấp" tone="danger" onClick={() => toast.error("Đã gửi tín hiệu khẩn cấp")} />
            </div>
          )}
        </div>

        {/* Trip info */}
        <div className="mt-3 rounded-3xl bg-surface p-4">
          <div className="flex items-start gap-3">
            <div className="mt-1 flex flex-col items-center gap-1">
              <div className="h-2.5 w-2.5 rounded-full bg-primary" />
              <div className="h-8 w-px bg-border" />
              <div className="h-2.5 w-2.5 rounded-full bg-success" />
            </div>
            <div className="flex-1 space-y-3 text-sm">
              <div>
                <div className="text-[10px] uppercase text-muted-foreground">Điểm đón</div>
                <div className="font-semibold">Quán Bia Sài Gòn, Nguyễn Huệ</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-muted-foreground">Điểm đến</div>
                <div className="font-semibold">Phường Mỹ Phú, Cao Lãnh</div>
              </div>
            </div>
          </div>
          <div className="mt-3 flex justify-around border-t border-border pt-3 text-center text-xs">
            <div><div className="text-muted-foreground">Quãng đường</div><div className="font-bold">6,8 km</div></div>
            <div><div className="text-muted-foreground">Thời gian</div><div className="font-bold">18 phút</div></div>
            <div><div className="text-muted-foreground">Tổng tiền</div><div className="font-bold text-primary">127.000đ</div></div>
          </div>
        </div>

        {isFinal ? (
          <CompletedSection onDone={() => navigate({ to: "/trips" })} />
        ) : (
          <div className="mt-4 space-y-2">
            <button onClick={advance} className="w-full rounded-2xl gradient-primary py-3.5 text-sm font-bold text-primary-foreground shadow-glow active:scale-[.98] transition">
              Mô phỏng bước tiếp theo → {TRIP_STATUS_LABEL[FLOW[Math.min(statusIdx + 1, FLOW.length - 1)]]}
            </button>
            <button onClick={() => { toast("Đã hủy chuyến"); navigate({ to: "/home" }); }} className="w-full rounded-2xl border border-border py-3 text-sm font-semibold text-muted-foreground">
              <X className="mr-1 inline h-4 w-4" /> Hủy chuyến
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ActionBtn({ Icon, label, onClick, tone }: { Icon: typeof Phone; label: string; onClick: () => void; tone?: "danger" }) {
  return (
    <button onClick={onClick} className={cn(
      "flex flex-col items-center gap-1 rounded-2xl bg-background py-3 text-xs font-bold",
      tone === "danger" && "bg-destructive/15 text-destructive",
    )}>
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function CompletedSection({ onDone }: { onDone: () => void }) {
  const [rating, setRating] = useState(5);
  const [note, setNote] = useState("");
  return (
    <div className="mt-4 rounded-3xl bg-surface p-4">
      <div className="text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-success/20 text-2xl">✅</div>
        <div className="mt-2 text-base font-black">Chuyến đi hoàn thành</div>
        <div className="text-xs text-muted-foreground">Cảm ơn bạn đã sử dụng dịch vụ</div>
      </div>
      <div className="mt-4">
        <div className="text-xs font-semibold text-muted-foreground">Đánh giá tài xế</div>
        <div className="mt-2 flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} onClick={() => setRating(n)}>
              <Star className={cn("h-8 w-8", n <= rating ? "fill-warning text-warning" : "text-muted")} />
            </button>
          ))}
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Chia sẻ trải nghiệm của bạn..."
          className="mt-3 w-full rounded-2xl bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          rows={3}
        />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button className="rounded-2xl border border-border py-3 text-sm font-bold">Báo cáo sự cố</button>
        <button onClick={() => { toast.success("Cảm ơn bạn đã đánh giá!"); onDone(); }} className="rounded-2xl gradient-primary py-3 text-sm font-bold text-primary-foreground shadow-glow">
          Gửi đánh giá
        </button>
      </div>
    </div>
  );
}

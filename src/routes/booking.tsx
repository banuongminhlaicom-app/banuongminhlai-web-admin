import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Clock, MapPin, Navigation, Tag } from "lucide-react";
import { MapPreview } from "@/components/MapPreview";
import { VEHICLE_TYPES, SAVED_ADDRESSES } from "@/lib/mock";
import { calculateQuote } from "@/lib/pricing";
import { formatKm, formatMinutes, formatVND } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/booking")({
  head: () => ({ meta: [{ title: "Đặt tài xế" }] }),
  component: Booking,
});

function Booking() {
  const [pickup, setPickup] = useState("Quán Bia Sài Gòn, Nguyễn Huệ, Cao Lãnh");
  const [destination, setDestination] = useState("Phường Mỹ Phú, Cao Lãnh");
  const [vehicle, setVehicle] = useState(VEHICLE_TYPES[1].id);
  const [when, setWhen] = useState<"now" | "later">("now");
  const [promo, setPromo] = useState("");
  const navigate = useNavigate();

  const distanceKm = 6.8;
  const duration = 18;
  const multiplier = VEHICLE_TYPES.find((v) => v.id === vehicle)?.multiplier ?? 1;
  const discount = promo.trim().toUpperCase() === "TAIXE30" ? 30000 : 0;
  const baseQuote = calculateQuote({ distanceKm, discount });
  const total = Math.round((baseQuote.total * multiplier) / 1000) * 1000;

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background pb-6">
      <div className="safe-top sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-background px-5 py-3">
        <button onClick={() => history.back()} className="grid h-10 w-10 place-items-center rounded-full bg-surface">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-bold">Đặt tài xế</h1>
      </div>

      <MapPreview className="h-48 w-full" showRoute />

      <div className="-mt-5 rounded-t-3xl bg-background px-5 pt-5">
        {/* Location inputs */}
        <div className="rounded-3xl bg-surface p-4">
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center gap-1">
              <div className="h-2.5 w-2.5 rounded-full bg-primary" />
              <div className="h-6 w-px bg-border" />
              <div className="h-2.5 w-2.5 rounded-full bg-success" />
            </div>
            <div className="flex-1 space-y-2">
              <input
                value={pickup}
                onChange={(e) => setPickup(e.target.value)}
                placeholder="Tài xế sẽ đến đón bạn ở đâu?"
                className="w-full rounded-xl bg-background px-3 py-2.5 text-sm font-medium outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/40"
              />
              <input
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Bạn muốn về đâu?"
                className="w-full rounded-xl bg-background px-3 py-2.5 text-sm font-medium outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-success/40"
              />
            </div>
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar">
            {SAVED_ADDRESSES.map((a) => (
              <button key={a.id} onClick={() => setDestination(a.address)} className="flex shrink-0 items-center gap-1.5 rounded-full bg-background px-3 py-1.5 text-xs font-semibold">
                <span>{a.icon}</span> {a.label}
              </button>
            ))}
          </div>
        </div>

        {/* Route info */}
        <div className="mt-3 flex items-center justify-around rounded-2xl bg-surface/60 p-3 text-center text-xs">
          <div>
            <div className="flex items-center gap-1 text-muted-foreground"><Navigation className="h-3 w-3" /> Khoảng cách</div>
            <div className="font-bold">{formatKm(distanceKm)}</div>
          </div>
          <div className="h-8 w-px bg-border" />
          <div>
            <div className="flex items-center gap-1 text-muted-foreground"><Clock className="h-3 w-3" /> Thời gian</div>
            <div className="font-bold">{formatMinutes(duration)}</div>
          </div>
          <div className="h-8 w-px bg-border" />
          <div>
            <div className="flex items-center gap-1 text-muted-foreground"><MapPin className="h-3 w-3" /> Tuyến</div>
            <div className="font-bold">Tối ưu</div>
          </div>
        </div>

        {/* Vehicle */}
        <h3 className="mb-2 mt-5 text-sm font-bold">Chọn phương tiện của bạn</h3>
        <div className="grid grid-cols-2 gap-2">
          {VEHICLE_TYPES.map((v) => (
            <button
              key={v.id}
              onClick={() => setVehicle(v.id)}
              className={cn(
                "flex items-center gap-3 rounded-2xl border p-3 text-left transition",
                vehicle === v.id ? "border-primary bg-primary/10" : "border-border bg-surface",
              )}
            >
              <span className="text-2xl">{v.icon}</span>
              <div className="min-w-0">
                <div className="text-sm font-bold">{v.label}</div>
                <div className="truncate text-[10px] text-muted-foreground">{v.desc}</div>
              </div>
            </button>
          ))}
        </div>

        {/* When */}
        <h3 className="mb-2 mt-5 text-sm font-bold">Thời gian</h3>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setWhen("now")} className={cn("rounded-2xl py-3 text-sm font-bold", when === "now" ? "gradient-primary text-primary-foreground shadow-glow" : "bg-surface text-muted-foreground")}>
            Đặt ngay
          </button>
          <button onClick={() => setWhen("later")} className={cn("rounded-2xl py-3 text-sm font-bold", when === "later" ? "gradient-primary text-primary-foreground shadow-glow" : "bg-surface text-muted-foreground")}>
            Đặt lịch trước
          </button>
        </div>

        {/* Promo */}
        <div className="mt-4 flex items-center gap-2 rounded-2xl bg-surface p-3">
          <Tag className="h-4 w-4 text-primary" />
          <input value={promo} onChange={(e) => setPromo(e.target.value)} placeholder="Nhập mã ưu đãi (thử TAIXE30)" className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
          {discount > 0 && <span className="rounded-full bg-success/20 px-2 py-0.5 text-xs font-bold text-success">-{formatVND(discount)}</span>}
        </div>

        {/* Quote card */}
        <div className="mt-4 rounded-3xl bg-surface p-4">
          <div className="mb-3 text-xs font-semibold uppercase text-muted-foreground">Chi tiết báo giá</div>
          <QuoteRow label="Phí mở cửa" value={baseQuote.openingFee} />
          <QuoteRow label={`Quãng đường (${formatKm(distanceKm)})`} value={baseQuote.distanceFee} />
          {baseQuote.nightSurcharge > 0 && <QuoteRow label="Phụ phí ban đêm (22:00–05:00)" value={baseQuote.nightSurcharge} />}
          {discount > 0 && <QuoteRow label="Mã giảm giá" value={-discount} />}
          <div className="my-2 border-t border-dashed border-border" />
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold">Tổng tiền dự kiến</span>
            <span className="text-2xl font-black text-primary">{formatVND(total)}</span>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            * Giá thực tế có thể thay đổi nếu bạn thay đổi điểm đến hoặc phát sinh thời gian chờ.
          </p>
        </div>

        <button
          onClick={() => navigate({ to: "/booking/searching" })}
          className="mt-4 w-full rounded-2xl gradient-primary py-4 text-base font-bold text-primary-foreground shadow-glow active:scale-[.98] transition"
        >
          ĐẶT TÀI XẾ NGAY · {formatVND(total)}
        </button>
        <Link to="/home" className="mt-3 block text-center text-sm text-muted-foreground">Quay lại trang chủ</Link>
      </div>
    </div>
  );
}

function QuoteRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between py-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-semibold", value < 0 && "text-success")}>{value < 0 ? "-" : ""}{formatVND(Math.abs(value))}</span>
    </div>
  );
}

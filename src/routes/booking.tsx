import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Banknote,
  Calendar as CalendarIcon,
  Car,
  Check,
  Clock,
  CreditCard,
  Loader2,
  MapPin,
  Navigation,
  Pencil,
  Plus,
  QrCode,
  Tag,
  X,
} from "lucide-react";
import { MapPreview } from "@/components/MapPreview";
import { VEHICLE_TYPES, SAVED_ADDRESSES } from "@/lib/mock";
import { DEFAULT_PRICING } from "@/lib/pricing";
import { formatKm, formatMinutes, formatVND } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

export const Route = createFileRoute("/booking")({
  head: () => ({ meta: [{ title: "Đặt tài xế" }] }),
  component: Booking,
});

type Gearbox = "auto" | "manual";
interface SavedVehicle {
  name: string;
  plate: string;
  type: string;
  gearbox: Gearbox;
  note?: string;
}

type PaymentMethod = "cash" | "transfer" | "qr";

const PAYMENT_METHODS: { id: PaymentMethod; label: string; icon: typeof Banknote }[] = [
  { id: "cash", label: "Tiền mặt", icon: Banknote },
  { id: "transfer", label: "Chuyển khoản", icon: CreditCard },
  { id: "qr", label: "QR ngân hàng", icon: QrCode },
];

const DEFAULT_VEHICLE: SavedVehicle = {
  name: "Toyota Vios 2022",
  plate: "66A-123.45",
  type: "auto",
  gearbox: "auto",
};

function roundTo1000(v: number) {
  return Math.round(v / 1000) * 1000;
}

function Booking() {
  const navigate = useNavigate();

  const [pickup, setPickup] = useState("Quán Bia Sài Gòn, Nguyễn Huệ, Cao Lãnh");
  const [destination, setDestination] = useState("Phường Mỹ Phú, Cao Lãnh");
  const [vehicle, setVehicle] = useState(VEHICLE_TYPES[1].id);
  const [when, setWhen] = useState<"now" | "later">("now");
  const [scheduled, setScheduled] = useState<{ date: string; time: string } | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const [savedVehicle, setSavedVehicle] = useState<SavedVehicle | null>(DEFAULT_VEHICLE);
  const [vehicleSheetOpen, setVehicleSheetOpen] = useState(false);

  const [payment, setPayment] = useState<PaymentMethod>("cash");
  const [note, setNote] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const [promo, setPromo] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discount: number } | null>(null);
  const [promoError, setPromoError] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const distanceKm = 6.8;
  const duration = 18;
  const rule = DEFAULT_PRICING;

  const quote = useMemo(() => {
    const multiplier = VEHICLE_TYPES.find((v) => v.id === vehicle)?.multiplier ?? 1;
    const openingFee = rule.openingFee * multiplier;
    const firstBlock = rule.firstDistancePrice * multiplier;
    const extraKm = Math.max(0, distanceKm - rule.firstDistanceLimit);
    const extraFee = extraKm * rule.pricePerExtraKm * multiplier;
    const discount = appliedPromo?.discount ?? 0;
    const raw = openingFee + firstBlock + extraFee - discount;
    const total = roundTo1000(Math.max(raw, 0));
    return { multiplier, openingFee, firstBlock, extraKm, extraFee, discount, total };
  }, [vehicle, appliedPromo, rule, distanceKm]);

  const isValid =
    pickup.trim() &&
    destination.trim() &&
    vehicle &&
    savedVehicle &&
    payment &&
    confirmed &&
    (when === "now" || scheduled);

  function applyPromo() {
    const code = promo.trim().toUpperCase();
    if (!code) {
      setPromoError("Vui lòng nhập mã ưu đãi");
      return;
    }
    if (code === "TAIXE30") {
      setAppliedPromo({ code, discount: 30000 });
      setPromoError("");
      toast.success("Đã áp dụng mã TAIXE30 (-30.000đ)");
    } else {
      setAppliedPromo(null);
      setPromoError("Mã ưu đãi không hợp lệ hoặc đã hết hạn");
    }
  }

  function removePromo() {
    setAppliedPromo(null);
    setPromo("");
    setPromoError("");
  }

  function handleSubmit() {
    if (!isValid || submitting) return;
    setSubmitting(true);
    setTimeout(() => {
      navigate({ to: "/booking/searching" });
    }, 1000);
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background pb-32">
      <div className="safe-top sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-background px-5 py-3">
        <button onClick={() => history.back()} className="grid h-10 w-10 place-items-center rounded-full bg-surface">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-semibold">Đặt tài xế</h1>
      </div>

      <MapPreview className="h-48 w-full" showRoute />

      <div className="-mt-5 rounded-t-3xl bg-background px-5 pt-5">
        {/* Locations */}
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
              <button
                key={a.id}
                onClick={() => setDestination(a.address)}
                className="flex shrink-0 items-center gap-1.5 rounded-full bg-background px-3 py-1.5 text-xs font-semibold"
              >
                <span>{a.icon}</span> {a.label}
              </button>
            ))}
          </div>
        </div>

        {/* Route summary */}
        <div className="mt-3 flex items-center justify-around rounded-2xl bg-surface/60 p-3 text-center text-xs">
          <div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Navigation className="h-3 w-3" /> Khoảng cách
            </div>
            <div className="text-sm font-semibold">{formatKm(distanceKm)}</div>
          </div>
          <div className="h-8 w-px bg-border" />
          <div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" /> Thời gian
            </div>
            <div className="text-sm font-semibold">{formatMinutes(duration)}</div>
          </div>
          <div className="h-8 w-px bg-border" />
          <div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <MapPin className="h-3 w-3" /> Tuyến
            </div>
            <div className="text-sm font-semibold">Tối ưu</div>
          </div>
        </div>

        {/* Vehicle types */}
        <h3 className="mb-2 mt-5 text-sm font-semibold">Chọn phương tiện của bạn</h3>
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
                <div className="text-sm font-semibold">{v.label}</div>
                <div className="truncate text-[11px] text-muted-foreground">{v.desc}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Saved vehicle */}
        <h3 className="mb-2 mt-5 text-sm font-semibold">Xe của bạn</h3>
        {savedVehicle ? (
          <div className="flex items-center gap-3 rounded-2xl bg-surface p-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
              <Car className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{savedVehicle.name}</div>
              <div className="text-[12px] text-muted-foreground">
                {savedVehicle.plate} · {savedVehicle.gearbox === "auto" ? "Số tự động" : "Số sàn"}
              </div>
            </div>
            <button
              onClick={() => setVehicleSheetOpen(true)}
              className="flex items-center gap-1 rounded-full bg-background px-3 py-1.5 text-xs font-semibold"
            >
              <Pencil className="h-3 w-3" /> Thay đổi
            </button>
          </div>
        ) : (
          <button
            onClick={() => setVehicleSheetOpen(true)}
            className="flex w-full items-center gap-2 rounded-2xl border border-dashed border-border bg-surface p-3 text-sm font-semibold text-primary"
          >
            <Plus className="h-4 w-4" /> Thêm phương tiện của bạn
          </button>
        )}

        {/* Time */}
        <h3 className="mb-2 mt-5 text-sm font-semibold">Thời gian</h3>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              setWhen("now");
              setScheduled(null);
            }}
            className={cn(
              "rounded-2xl py-3 text-sm font-semibold",
              when === "now" ? "gradient-primary text-primary-foreground shadow-glow" : "bg-surface text-muted-foreground",
            )}
          >
            Đặt ngay
          </button>
          <button
            onClick={() => {
              setWhen("later");
              setScheduleOpen(true);
            }}
            className={cn(
              "rounded-2xl py-3 text-sm font-semibold",
              when === "later" ? "gradient-primary text-primary-foreground shadow-glow" : "bg-surface text-muted-foreground",
            )}
          >
            Đặt lịch trước
          </button>
        </div>
        {when === "later" && scheduled && (
          <button
            onClick={() => setScheduleOpen(true)}
            className="mt-2 flex w-full items-center gap-2 rounded-2xl bg-surface p-3 text-sm font-semibold"
          >
            <CalendarIcon className="h-4 w-4 text-primary" />
            {scheduled.date} lúc {scheduled.time}
            <span className="ml-auto text-xs text-muted-foreground">Đổi</span>
          </button>
        )}

        {/* Payment */}
        <h3 className="mb-2 mt-5 text-sm font-semibold">Phương thức thanh toán</h3>
        <div className="grid grid-cols-3 gap-2">
          {PAYMENT_METHODS.map((m) => {
            const Icon = m.icon;
            const active = payment === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setPayment(m.id)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-2xl border p-3 text-[12px] font-semibold transition",
                  active ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface text-muted-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                {m.label}
              </button>
            );
          })}
        </div>

        {/* Note */}
        <h3 className="mb-2 mt-5 text-sm font-semibold">Ghi chú cho tài xế</h3>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ví dụ: Xe đậu ở tầng hầm, gọi cho tôi khi đến…"
          className="min-h-[72px] rounded-2xl bg-surface"
        />

        {/* Promo */}
        <h3 className="mb-2 mt-5 text-sm font-semibold">Mã ưu đãi</h3>
        <div className="flex items-center gap-2 rounded-2xl bg-surface p-2 pl-3">
          <Tag className="h-4 w-4 text-primary" />
          <input
            value={promo}
            onChange={(e) => {
              setPromo(e.target.value);
              setPromoError("");
            }}
            disabled={!!appliedPromo}
            placeholder="Nhập mã (thử TAIXE30)"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:opacity-60"
          />
          {appliedPromo ? (
            <button
              onClick={removePromo}
              className="flex items-center gap-1 rounded-full bg-background px-3 py-1.5 text-xs font-semibold"
            >
              <X className="h-3 w-3" /> Xóa
            </button>
          ) : (
            <button
              onClick={applyPromo}
              className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
            >
              Áp dụng
            </button>
          )}
        </div>
        {promoError && <p className="mt-1 pl-1 text-[12px] text-primary">{promoError}</p>}
        {appliedPromo && (
          <p className="mt-1 pl-1 text-[12px] text-success">
            ✓ Đã áp dụng {appliedPromo.code} (-{formatVND(appliedPromo.discount)})
          </p>
        )}

        {/* Quote breakdown */}
        <div className="mt-5 rounded-3xl bg-surface p-4">
          <div className="mb-3 text-[12px] font-semibold uppercase text-muted-foreground">Chi tiết báo giá</div>
          <QuoteRow label="Phí mở cửa" value={quote.openingFee} />
          <QuoteRow label={`${rule.firstDistanceLimit} km đầu`} value={quote.firstBlock} />
          {quote.extraKm > 0 && (
            <QuoteRow
              label={`${quote.extraKm.toFixed(1)} km tiếp theo × ${formatVND(rule.pricePerExtraKm * quote.multiplier)}/km`}
              value={quote.extraFee}
            />
          )}
          {quote.discount > 0 && <QuoteRow label={`Mã ưu đãi ${appliedPromo?.code}`} value={-quote.discount} />}
          <div className="my-2 border-t border-dashed border-border" />
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold">Tổng dự kiến</span>
            <span className="text-2xl font-black text-primary">{formatVND(quote.total)}</span>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            * Đã làm tròn đến 1.000đ. Giá thực tế có thể thay đổi nếu phát sinh quãng đường hoặc thời gian chờ.
          </p>
        </div>

        {/* Confirm checkbox */}
        <label className="mt-4 flex items-start gap-3 rounded-2xl border border-border bg-surface p-3">
          <Checkbox
            checked={confirmed}
            onCheckedChange={(v) => setConfirmed(v === true)}
            className="mt-0.5 shrink-0"
          />
          <span className="text-[13px] leading-snug">
            Tôi xác nhận tài xế sẽ sử dụng chính phương tiện của tôi để đưa tôi và phương tiện về điểm đến.
          </span>
        </label>
      </div>

      {/* Sticky CTA */}
      <div className="safe-bottom fixed bottom-0 left-1/2 z-30 w-full max-w-md -translate-x-1/2 border-t border-border bg-background/95 px-5 py-3 backdrop-blur">
        <button
          onClick={handleSubmit}
          disabled={!isValid || submitting}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold transition active:scale-[.98]",
            isValid && !submitting
              ? "gradient-primary text-primary-foreground shadow-glow"
              : "bg-surface text-muted-foreground",
          )}
        >
          {submitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" /> Đang xử lý…
            </>
          ) : (
            <>
              ĐẶT TÀI XẾ NGAY · {formatVND(quote.total)}
            </>
          )}
        </button>
        {!confirmed && (
          <p className="mt-1 text-center text-[11px] text-muted-foreground">
            Vui lòng xác nhận điều khoản để tiếp tục
          </p>
        )}
      </div>

      {/* Schedule sheet */}
      <ScheduleSheet
        open={scheduleOpen}
        onOpenChange={(o) => {
          setScheduleOpen(o);
          if (!o && !scheduled) setWhen("now");
        }}
        onConfirm={(d, t) => {
          setScheduled({ date: d, time: t });
          setScheduleOpen(false);
          setWhen("later");
        }}
      />

      {/* Vehicle sheet */}
      <VehicleSheet
        open={vehicleSheetOpen}
        onOpenChange={setVehicleSheetOpen}
        initial={savedVehicle}
        onSave={(v) => {
          setSavedVehicle(v);
          setVehicleSheetOpen(false);
          toast.success("Đã lưu phương tiện");
        }}
      />
    </div>
  );
}

function QuoteRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between py-1 text-[13px]">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-semibold", value < 0 && "text-success")}>
        {value < 0 ? "-" : ""}
        {formatVND(Math.abs(Math.round(value)))}
      </span>
    </div>
  );
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function ScheduleSheet({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onConfirm: (date: string, time: string) => void;
}) {
  const now = new Date();
  const min = new Date(now.getTime() + 30 * 60 * 1000);
  const defaultDate = `${min.getFullYear()}-${pad(min.getMonth() + 1)}-${pad(min.getDate())}`;
  const defaultTime = `${pad(min.getHours())}:${pad(min.getMinutes())}`;

  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState(defaultTime);
  const [error, setError] = useState("");

  function confirm() {
    const chosen = new Date(`${date}T${time}`);
    if (isNaN(chosen.getTime())) {
      setError("Ngày giờ không hợp lệ");
      return;
    }
    if (chosen.getTime() < Date.now() + 30 * 60 * 1000) {
      setError("Vui lòng chọn thời gian ít nhất 30 phút sau hiện tại");
      return;
    }
    setError("");
    const label = chosen.toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit" });
    onConfirm(label, time);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl">
        <SheetHeader>
          <SheetTitle>Đặt lịch trước</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-3">
          <div>
            <Label className="text-xs">Chọn ngày</Label>
            <Input type="date" min={defaultDate} value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Chọn giờ</Label>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="mt-1" />
          </div>
          {error && <p className="text-[12px] text-primary">{error}</p>}
          <p className="text-[11px] text-muted-foreground">Thời gian đặt phải muộn hơn hiện tại ít nhất 30 phút.</p>
          <button
            onClick={confirm}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl gradient-primary py-3 text-sm font-bold text-primary-foreground shadow-glow"
          >
            <Check className="h-4 w-4" /> Xác nhận
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function VehicleSheet({
  open,
  onOpenChange,
  initial,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial: SavedVehicle | null;
  onSave: (v: SavedVehicle) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [plate, setPlate] = useState(initial?.plate ?? "");
  const [type, setType] = useState(initial?.type ?? "auto");
  const [gearbox, setGearbox] = useState<Gearbox>(initial?.gearbox ?? "auto");
  const [note, setNote] = useState(initial?.note ?? "");
  const [error, setError] = useState("");

  function save() {
    if (!name.trim() || !plate.trim()) {
      setError("Vui lòng nhập tên xe và biển số");
      return;
    }
    onSave({ name: name.trim(), plate: plate.trim(), type, gearbox, note: note.trim() });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl">
        <SheetHeader>
          <SheetTitle>{initial ? "Cập nhật phương tiện" : "Thêm phương tiện"}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-3">
          <div>
            <Label className="text-xs">Tên xe</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Toyota Vios 2022" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Biển số</Label>
            <Input value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase())} placeholder="VD: 66A-123.45" className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Loại xe</Label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="moto">Xe máy</option>
                <option value="auto">Ô tô 4-5 chỗ</option>
                <option value="7seat">Xe 7 chỗ</option>
                <option value="pickup">Bán tải</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">Hộp số</Label>
              <select
                value={gearbox}
                onChange={(e) => setGearbox(e.target.value as Gearbox)}
                className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="auto">Số tự động</option>
                <option value="manual">Số sàn</option>
              </select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Ghi chú (tuỳ chọn)</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: Xe màu trắng, đậu tại tầng B1"
              className="mt-1 min-h-[64px]"
            />
          </div>
          {error && <p className="text-[12px] text-primary">{error}</p>}
          <button
            onClick={save}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl gradient-primary py-3 text-sm font-bold text-primary-foreground shadow-glow"
          >
            <Check className="h-4 w-4" /> Lưu phương tiện
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

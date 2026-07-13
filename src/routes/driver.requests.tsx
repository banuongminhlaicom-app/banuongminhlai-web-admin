import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, MapPin, Navigation } from "lucide-react";
import { toast } from "sonner";
import { formatKm, formatMinutes, formatVND } from "@/lib/format";

export const Route = createFileRoute("/driver/requests")({
  head: () => ({ meta: [{ title: "Yêu cầu chuyến mới" }] }),
  component: Requests,
});

function Requests() {
  const [seconds, setSeconds] = useState(20);
  const navigate = useNavigate();

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background pb-10">
      <div className="safe-top flex items-center gap-3 px-5 py-3">
        <button onClick={() => history.back()} className="grid h-10 w-10 place-items-center rounded-full bg-surface"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="text-lg font-black">Yêu cầu chuyến mới</h1>
      </div>

      <div className="mx-5 rounded-3xl bg-surface p-5 shadow-elevated">
        <div className="flex items-center justify-between">
          <div className="rounded-full bg-primary/20 px-3 py-1 text-xs font-bold text-primary">Đặt ngay</div>
          <div className="grid h-14 w-14 place-items-center rounded-full border-4 border-primary text-lg font-black text-primary">
            {seconds}s
          </div>
        </div>

        <div className="mt-4 flex items-start gap-3">
          <div className="mt-1 flex flex-col items-center gap-1">
            <div className="h-2.5 w-2.5 rounded-full bg-primary" />
            <div className="h-10 w-px bg-border" />
            <div className="h-2.5 w-2.5 rounded-full bg-success" />
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <div className="text-[10px] uppercase text-muted-foreground">Điểm đón · 1.2km từ bạn</div>
              <div className="text-sm font-bold">Quán Bia Sài Gòn, Nguyễn Huệ</div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-muted-foreground">Điểm đến · {formatKm(6.8)}</div>
              <div className="text-sm font-bold">Phường Mỹ Phú, Cao Lãnh</div>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-background p-3 text-center text-xs">
          <div><div className="text-muted-foreground flex items-center gap-1 justify-center"><MapPin className="h-3 w-3" />Loại</div><div className="mt-1 font-bold">Vios AT</div></div>
          <div><div className="text-muted-foreground flex items-center gap-1 justify-center"><Navigation className="h-3 w-3" />TG</div><div className="mt-1 font-bold">{formatMinutes(18)}</div></div>
          <div><div className="text-muted-foreground">Giá</div><div className="mt-1 font-black text-primary">{formatVND(127000)}</div></div>
        </div>

        <div className="mt-4 rounded-xl bg-background/60 p-3 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Ghi chú:</span> Xe Vios đen, đậu trước quán, khách đang chờ ở lễ tân.
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button onClick={() => { toast("Đã từ chối chuyến"); navigate({ to: "/driver" }); }} className="rounded-2xl border border-border py-3.5 text-sm font-bold">
            Từ chối
          </button>
          <button onClick={() => { toast.success("Đã nhận chuyến!"); navigate({ to: "/driver/trips/$id", params: { id: "8821" } }); }} className="rounded-2xl gradient-primary py-3.5 text-sm font-bold text-primary-foreground shadow-glow">
            Nhận chuyến
          </button>
        </div>
      </div>
    </div>
  );
}

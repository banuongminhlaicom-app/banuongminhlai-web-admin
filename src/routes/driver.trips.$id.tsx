import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, MessageSquare, Phone } from "lucide-react";
import { MapPreview } from "@/components/MapPreview";
import { toast } from "sonner";

export const Route = createFileRoute("/driver/trips/$id")({
  component: DriverTrip,
});

const STEPS = [
  "Bắt đầu di chuyển đến khách",
  "Đã đến điểm đón",
  "Đã gặp khách",
  "Bắt đầu chuyến đi",
  "Hoàn thành chuyến đi",
];

function DriverTrip() {
  const { id } = Route.useParams();
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  const next = () => {
    if (step >= STEPS.length - 1) {
      toast.success("Chuyến đi đã hoàn thành!");
      navigate({ to: "/driver" });
      return;
    }
    toast.success(STEPS[step]);
    setStep((s) => s + 1);
  };

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background pb-10">
      <MapPreview className="h-64 w-full" showRoute driverPin />
      <div className="safe-top absolute inset-x-0 top-0 flex items-center justify-between px-5 py-3">
        <button onClick={() => history.back()} className="grid h-10 w-10 place-items-center rounded-full bg-surface/95 backdrop-blur"><ArrowLeft className="h-5 w-5" /></button>
        <div className="rounded-full bg-surface/95 px-3 py-1.5 text-xs font-bold backdrop-blur">Chuyến BUML-{id}</div>
      </div>

      <div className="-mt-6 rounded-t-3xl bg-background px-5 pt-5">
        <div className="rounded-3xl bg-surface p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-background text-lg font-black text-primary">NA</div>
            <div className="min-w-0 flex-1">
              <div className="font-bold">Nguyễn Văn An</div>
              <div className="text-xs text-muted-foreground">+84 901 ••• 567 · Xe Vios AT</div>
            </div>
            <button onClick={() => toast("Đang gọi khách...")} className="grid h-10 w-10 place-items-center rounded-full bg-success/20 text-success"><Phone className="h-4 w-4" /></button>
            <button onClick={() => toast("Mở khung chat")} className="grid h-10 w-10 place-items-center rounded-full bg-background"><MessageSquare className="h-4 w-4" /></button>
          </div>
        </div>

        <div className="mt-3 rounded-3xl bg-surface p-4">
          <div className="text-xs font-semibold uppercase text-muted-foreground">Tiến trình chuyến</div>
          <ol className="mt-2 space-y-2">
            {STEPS.map((s, i) => (
              <li key={s} className="flex items-center gap-3 text-sm">
                <div className={`grid h-6 w-6 place-items-center rounded-full text-[10px] font-black ${i < step ? "bg-success text-success-foreground" : i === step ? "gradient-primary text-primary-foreground shadow-glow" : "bg-background text-muted-foreground"}`}>
                  {i < step ? "✓" : i + 1}
                </div>
                <span className={i <= step ? "font-semibold" : "text-muted-foreground"}>{s}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button onClick={() => toast.error("Đã gửi báo cáo sự cố")} className="rounded-2xl border border-border py-3.5 text-sm font-bold">Báo cáo sự cố</button>
          <button onClick={next} className="rounded-2xl gradient-primary py-3.5 text-sm font-bold text-primary-foreground shadow-glow">
            {step >= STEPS.length - 1 ? "Hoàn tất" : STEPS[step]}
          </button>
        </div>
      </div>
    </div>
  );
}

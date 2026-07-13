import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Award, Gift, Sparkles, Star, Ticket, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { formatVND } from "@/lib/format";

export const Route = createFileRoute("/rewards")({
  head: () => ({ meta: [{ title: "Điểm thưởng" }] }),
  component: Rewards,
});

const POINTS = 230;
const NEXT_TIER = 500;
const HISTORY = [
  { id: "h1", title: "Hoàn thành chuyến BUML-8821", time: "Hôm nay · 20:32", delta: +18 },
  { id: "h2", title: "Đánh giá tài xế 5 sao", time: "Hôm nay · 20:35", delta: +5 },
  { id: "h3", title: "Đổi ưu đãi CUOITUAN", time: "12/07 · 19:10", delta: -50 },
  { id: "h4", title: "Hoàn thành chuyến BUML-8798", time: "09/07 · 23:22", delta: +32 },
  { id: "h5", title: "Thưởng giới thiệu bạn bè", time: "05/07 · 10:00", delta: +100 },
] as const;

const REWARDS = [
  { id: "r1", title: "Voucher 30.000đ", desc: "Giảm cho chuyến kế tiếp", cost: 150, Icon: Ticket },
  { id: "r2", title: "Voucher 50.000đ", desc: "Áp dụng chuyến ≥ 150.000đ", cost: 250, Icon: Ticket },
  { id: "r3", title: "Miễn phụ phí đêm", desc: "1 lần dùng, chuyến sau 22:00", cost: 120, Icon: Sparkles },
  { id: "r4", title: "Nâng hạng Bạc", desc: "Ưu tiên tìm tài xế 3 tháng", cost: 400, Icon: Award },
] as const;

function Rewards() {
  const progress = Math.min(100, Math.round((POINTS / NEXT_TIER) * 100));

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background pb-24">
      <div className="safe-top flex items-center gap-3 px-5 py-3">
        <button onClick={() => history.back()} className="grid h-10 w-10 place-items-center rounded-full bg-surface">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-black">Điểm thưởng</h1>
      </div>

      <div className="mx-5 rounded-3xl gradient-primary p-5 text-primary-foreground shadow-glow">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase opacity-80">Điểm hiện tại</div>
            <div className="mt-1 flex items-end gap-1">
              <span className="text-4xl font-black leading-none">{POINTS}</span>
              <span className="mb-1 text-xs font-bold opacity-80">điểm</span>
            </div>
          </div>
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/15 backdrop-blur">
            <Award className="h-7 w-7" />
          </div>
        </div>
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-[11px] opacity-90">
            <span>Hạng Đồng</span>
            <span>Còn {NEXT_TIER - POINTS} điểm lên Bạc</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/20">
            <div className="h-full rounded-full bg-white" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <div className="mx-5 mt-4 grid grid-cols-3 gap-2 text-center">
        <MiniStat Icon={TrendingUp} label="Tháng này" value="+55" />
        <MiniStat Icon={Star} label="Trung bình" value="4.9" />
        <MiniStat Icon={Gift} label="Đã đổi" value="2" />
      </div>

      <div className="mx-5 mt-5">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-black">Đổi ưu đãi</h2>
          <span className="text-[11px] text-muted-foreground">Dùng điểm để nhận voucher</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {REWARDS.map((r) => {
            const enough = POINTS >= r.cost;
            return (
              <button
                key={r.id}
                disabled={!enough}
                onClick={() => toast.success(`Đã đổi: ${r.title}`)}
                className="rounded-2xl bg-surface p-3 text-left transition active:scale-[0.98] disabled:opacity-50"
              >
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/15 text-primary">
                  <r.Icon className="h-4 w-4" />
                </div>
                <div className="mt-2 text-sm font-bold leading-tight">{r.title}</div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">{r.desc}</div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs font-black text-primary">{r.cost} điểm</span>
                  {!enough && <span className="text-[10px] text-muted-foreground">Chưa đủ</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mx-5 mt-5">
        <h2 className="mb-2 text-sm font-black">Lịch sử tích điểm</h2>
        <div className="divide-y divide-border/60 overflow-hidden rounded-2xl bg-surface">
          {HISTORY.map((h) => (
            <div key={h.id} className="flex items-center justify-between p-3.5">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{h.title}</div>
                <div className="text-[11px] text-muted-foreground">{h.time}</div>
              </div>
              <div className={`text-sm font-black ${h.delta > 0 ? "text-success" : "text-destructive"}`}>
                {h.delta > 0 ? `+${h.delta}` : h.delta}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 text-center text-[10px] text-muted-foreground">
          Quy đổi mỗi 1.000đ chi tiêu = 1 điểm · Không áp dụng cùng {formatVND(0)}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ Icon, label, value }: { Icon: typeof Award; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface p-3">
      <Icon className="mx-auto h-4 w-4 text-primary" />
      <div className="mt-1 text-sm font-black">{value}</div>
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
    </div>
  );
}

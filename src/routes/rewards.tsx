import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Award, Gift, Loader2, Sparkles, Star, Ticket, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { formatRelativeTime } from "@/lib/format";
import { useAuthState, useRequireRole } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase";
import {
  getLoyaltyPoints,
  getPointsTransactions,
  redeemReward,
  subscribeLoyaltyPoints,
  type PointsTransactionRow,
} from "@/lib/queries";

export const Route = createFileRoute("/rewards")({
  head: () => ({ meta: [{ title: "Điểm thưởng" }] }),
  component: Rewards,
});

const NEXT_TIER = 500;

const REWARDS = [
  { id: "r1", title: "Voucher 30.000đ", desc: "Giảm cho chuyến kế tiếp", cost: 150, Icon: Ticket },
  {
    id: "r2",
    title: "Voucher 50.000đ",
    desc: "Áp dụng chuyến ≥ 150.000đ",
    cost: 250,
    Icon: Ticket,
  },
  {
    id: "r3",
    title: "Miễn phụ phí đêm",
    desc: "1 lần dùng, chuyến sau 22:00",
    cost: 120,
    Icon: Sparkles,
  },
  { id: "r4", title: "Nâng hạng Bạc", desc: "Ưu tiên tìm tài xế 3 tháng", cost: 400, Icon: Award },
] as const;

const MOCK_POINTS = 230;
const MOCK_HISTORY: PointsTransactionRow[] = [
  {
    id: "h1",
    reason: "Hoàn thành chuyến BUML-8821",
    delta: 18,
    created_at: "2026-07-15T20:32:00Z",
  },
  { id: "h2", reason: "Đánh giá tài xế 5 sao", delta: 5, created_at: "2026-07-15T20:35:00Z" },
  { id: "h3", reason: "Đổi ưu đãi CUOITUAN", delta: -50, created_at: "2026-07-12T19:10:00Z" },
  {
    id: "h4",
    reason: "Hoàn thành chuyến BUML-8798",
    delta: 32,
    created_at: "2026-07-09T23:22:00Z",
  },
  { id: "h5", reason: "Thưởng giới thiệu bạn bè", delta: 100, created_at: "2026-07-05T10:00:00Z" },
];

function Rewards() {
  useRequireRole("customer");
  const { session } = useAuthState();
  const userId = session?.user.id;
  const useMock = !isSupabaseConfigured;
  const queryClient = useQueryClient();

  const { data: points } = useQuery({
    queryKey: ["loyalty-points", userId],
    queryFn: () => getLoyaltyPoints(userId!),
    enabled: !useMock && !!userId,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["points-tx", userId],
    queryFn: () => getPointsTransactions(userId!),
    enabled: !useMock && !!userId,
  });

  useEffect(() => {
    if (useMock || !userId) return;
    return subscribeLoyaltyPoints(userId, () => {
      queryClient.invalidateQueries({ queryKey: ["loyalty-points", userId] });
      queryClient.invalidateQueries({ queryKey: ["points-tx", userId] });
    });
  }, [useMock, userId, queryClient]);

  const redeemMutation = useMutation({
    mutationFn: ({ cost, title }: { cost: number; title: string }) => redeemReward(cost, title),
    onSuccess: (_data, vars) => {
      toast.success(`Đã đổi: ${vars.title}`);
      queryClient.invalidateQueries({ queryKey: ["loyalty-points", userId] });
      queryClient.invalidateQueries({ queryKey: ["points-tx", userId] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Không đổi được ưu đãi."),
  });

  const currentPoints = useMock ? MOCK_POINTS : (points?.balance ?? 0);
  const history = useMock ? MOCK_HISTORY : transactions;
  const progress = Math.min(100, Math.round((currentPoints / NEXT_TIER) * 100));

  const handleRedeem = (cost: number, title: string) => {
    if (useMock) {
      toast.success(`Đã đổi: ${title} (chế độ demo, chưa cấu hình Supabase)`);
      return;
    }
    redeemMutation.mutate({ cost, title });
  };

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background pb-24">
      <div className="safe-top flex items-center gap-3 px-5 py-3">
        <button
          onClick={() => window.history.back()}
          className="grid h-10 w-10 place-items-center rounded-full bg-surface"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-black">Điểm thưởng</h1>
      </div>

      <div className="mx-5 rounded-3xl gradient-primary p-5 text-primary-foreground shadow-glow">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase opacity-80">Điểm hiện tại</div>
            <div className="mt-1 flex items-end gap-1">
              <span className="text-4xl font-black leading-none">{currentPoints}</span>
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
            <span>Còn {Math.max(0, NEXT_TIER - currentPoints)} điểm lên Bạc</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/20">
            <div className="h-full rounded-full bg-white" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <div className="mx-5 mt-4 grid grid-cols-3 gap-2 text-center">
        <MiniStat
          Icon={TrendingUp}
          label="Tháng này"
          value={`+${history.filter((h) => h.delta > 0).reduce((s, h) => s + h.delta, 0)}`}
        />
        <MiniStat Icon={Star} label="Trung bình" value="4.9" />
        <MiniStat
          Icon={Gift}
          label="Đã đổi"
          value={String(history.filter((h) => h.delta < 0).length)}
        />
      </div>

      <div className="mx-5 mt-5">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-black">Đổi ưu đãi</h2>
          <span className="text-[11px] text-muted-foreground">Dùng điểm để nhận voucher</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {REWARDS.map((r) => {
            const enough = currentPoints >= r.cost;
            return (
              <button
                key={r.id}
                disabled={!enough || redeemMutation.isPending}
                onClick={() => handleRedeem(r.cost, r.title)}
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
        {history.length === 0 ? (
          <div className="rounded-2xl bg-surface p-4 text-center text-xs text-muted-foreground">
            {redeemMutation.isPending ? (
              <Loader2 className="mx-auto h-4 w-4 animate-spin" />
            ) : (
              "Chưa có lịch sử điểm nào."
            )}
          </div>
        ) : (
          <div className="divide-y divide-border/60 overflow-hidden rounded-2xl bg-surface">
            {history.map((h) => (
              <div key={h.id} className="flex items-center justify-between p-3.5">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{h.reason}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {formatRelativeTime(h.created_at)}
                  </div>
                </div>
                <div
                  className={`text-sm font-black ${h.delta > 0 ? "text-success" : "text-destructive"}`}
                >
                  {h.delta > 0 ? `+${h.delta}` : h.delta}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-2 text-center text-[10px] text-muted-foreground">
          Quy đổi mỗi 1.000đ chi tiêu = 1 điểm
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

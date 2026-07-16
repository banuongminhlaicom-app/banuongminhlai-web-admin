import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Banknote,
  CreditCard,
  History,
  Loader2,
  QrCode,
  Wallet as WalletIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatRelativeTime, formatVND } from "@/lib/format";
import { useAuthState, useRequireRole } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase";
import {
  getWallet,
  getWalletTransactions,
  subscribeWallet,
  topupWallet,
  type WalletTransactionRow,
} from "@/lib/queries";

export const Route = createFileRoute("/wallet")({
  head: () => ({ meta: [{ title: "Ví & thanh toán" }] }),
  component: Wallet,
});

const METHODS = [
  { Icon: Banknote, label: "Tiền mặt", desc: "Trả trực tiếp cho tài xế", active: true },
  { Icon: QrCode, label: "Chuyển khoản QR", desc: "VietQR - MB Bank", active: true },
  { Icon: CreditCard, label: "Thẻ ngân hàng", desc: "Sắp ra mắt", disabled: true },
  { Icon: WalletIcon, label: "Ví điện tử", desc: "Momo, ZaloPay - Sắp ra mắt", disabled: true },
];

const TOPUP_PRESETS = [50000, 100000, 200000, 500000];

const MOCK_BALANCE = 230000;
const MOCK_HISTORY: WalletTransactionRow[] = [
  {
    id: "m1",
    type: "topup",
    amount: 200000,
    description: "Nạp ví thành công",
    created_at: "2026-07-13T10:00:00Z",
  },
  {
    id: "m2",
    type: "trip_payment",
    amount: -127000,
    description: "Thanh toán chuyến BUML-8821",
    created_at: "2026-07-12T20:15:00Z",
  },
  {
    id: "m3",
    type: "topup",
    amount: 157000,
    description: "Nạp ví thành công",
    created_at: "2026-07-05T09:00:00Z",
  },
];

function Wallet() {
  useRequireRole("customer");
  const { session } = useAuthState();
  const userId = session?.user.id;
  const useMock = !isSupabaseConfigured;
  const queryClient = useQueryClient();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [topupOpen, setTopupOpen] = useState(false);

  const { data: wallet, isLoading } = useQuery({
    queryKey: ["wallet", userId],
    queryFn: () => getWallet(userId!),
    enabled: !useMock && !!userId,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["wallet-tx", userId],
    queryFn: () => getWalletTransactions(userId!),
    enabled: !useMock && !!userId,
  });

  useEffect(() => {
    if (useMock || !userId) return;
    return subscribeWallet(userId, () => {
      queryClient.invalidateQueries({ queryKey: ["wallet", userId] });
      queryClient.invalidateQueries({ queryKey: ["wallet-tx", userId] });
    });
  }, [useMock, userId, queryClient]);

  const topupMutation = useMutation({
    mutationFn: (amount: number) => topupWallet(amount),
    onSuccess: () => {
      toast.success("Đã nạp tiền vào ví (mô phỏng — chưa nối cổng thanh toán thật)");
      queryClient.invalidateQueries({ queryKey: ["wallet", userId] });
      queryClient.invalidateQueries({ queryKey: ["wallet-tx", userId] });
      setTopupOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Không nạp được tiền."),
  });

  const handleTopup = (amount: number) => {
    if (useMock) {
      toast.success(`Đã nạp ${formatVND(amount)} (chế độ demo, chưa cấu hình Supabase)`);
      setTopupOpen(false);
      return;
    }
    topupMutation.mutate(amount);
  };

  const balance = useMock ? MOCK_BALANCE : (wallet?.balance ?? 0);
  const historyList = useMock ? MOCK_HISTORY : transactions;

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background pb-10">
      <div className="safe-top flex items-center gap-3 px-5 py-3">
        <button
          onClick={() => window.history.back()}
          className="grid h-10 w-10 place-items-center rounded-full bg-surface"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-black">Ví & thanh toán</h1>
      </div>

      <div className="mx-5 rounded-3xl gradient-primary p-5 shadow-glow">
        <div className="text-xs font-semibold uppercase text-primary-foreground/80">Số dư ví</div>
        <div className="mt-2 text-3xl font-black text-primary-foreground">
          {!useMock && isLoading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            formatVND(balance)
          )}
        </div>
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => setTopupOpen(true)}
            className="flex-1 rounded-2xl bg-background/20 py-2.5 text-xs font-bold text-primary-foreground"
          >
            Nạp tiền
          </button>
          <button
            onClick={() => setHistoryOpen((v) => !v)}
            className="flex-1 rounded-2xl bg-background/20 py-2.5 text-xs font-bold text-primary-foreground"
          >
            Lịch sử
          </button>
        </div>
      </div>

      {historyOpen && (
        <div className="mx-5 mt-4">
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold">
            <History className="h-4 w-4" /> Lịch sử giao dịch
          </h3>
          {historyList.length === 0 ? (
            <div className="rounded-2xl bg-surface p-4 text-center text-xs text-muted-foreground">
              Chưa có giao dịch nào.
            </div>
          ) : (
            <div className="divide-y divide-border/60 overflow-hidden rounded-2xl bg-surface">
              {historyList.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-3.5">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{t.description ?? t.type}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {formatRelativeTime(t.created_at)}
                    </div>
                  </div>
                  <div
                    className={`text-sm font-black ${t.amount > 0 ? "text-success" : "text-destructive"}`}
                  >
                    {t.amount > 0 ? "+" : ""}
                    {formatVND(t.amount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mx-5 mt-6">
        <h3 className="mb-2 text-sm font-bold">Phương thức thanh toán</h3>
        <div className="space-y-2">
          {METHODS.map((m) => (
            <div
              key={m.label}
              className={`flex items-center gap-3 rounded-2xl bg-surface p-4 ${m.disabled ? "opacity-50" : ""}`}
            >
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-background text-primary">
                <m.Icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold">{m.label}</div>
                <div className="text-xs text-muted-foreground">{m.desc}</div>
              </div>
              {m.active && (
                <div className="rounded-full bg-success/20 px-2 py-0.5 text-[10px] font-bold text-success">
                  Đang dùng
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <Sheet open={topupOpen} onOpenChange={setTopupOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>Nạp tiền vào ví</SheetTitle>
          </SheetHeader>
          <p className="mt-1 text-xs text-muted-foreground">
            Chưa hỗ trợ cổng thanh toán thật — đây là thao tác mô phỏng để demo.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {TOPUP_PRESETS.map((amount) => (
              <button
                key={amount}
                onClick={() => handleTopup(amount)}
                disabled={topupMutation.isPending}
                className="flex items-center justify-center gap-1.5 rounded-2xl bg-surface py-3 text-sm font-bold disabled:opacity-60"
              >
                {topupMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}+
                {formatVND(amount)}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

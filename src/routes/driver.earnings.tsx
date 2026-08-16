import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { DriverShell } from "@/components/DriverShell";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuthState, useRequireRole } from "@/lib/auth";
import {
  getDriverEarningsSummary,
  getDriverEarningsTransactions,
  getDriverPayoutRequests,
  getDriverPayoutSummary,
  requestDriverPayout,
  subscribePayoutRequests,
  type PayoutRequestStatus,
} from "@/lib/queries";
import { formatRelativeTime, formatVND } from "@/lib/format";

export const Route = createFileRoute("/driver/earnings")({
  head: () => ({ meta: [{ title: "Thu nhập tài xế" }] }),
  component: Earnings,
});

const PAYOUT_STATUS_LABEL: Record<PayoutRequestStatus, string> = {
  pending: "Đang chờ duyệt",
  paid: "Đã chuyển khoản",
  rejected: "Bị từ chối",
};

const PAYOUT_STATUS_TONE: Record<PayoutRequestStatus, string> = {
  pending: "bg-warning/20 text-warning",
  paid: "bg-success/20 text-success",
  rejected: "bg-destructive/20 text-destructive",
};

function Earnings() {
  useRequireRole("driver");
  const authState = useAuthState();
  const driverId = authState.session?.user.id;
  const queryClient = useQueryClient();
  const [payoutOpen, setPayoutOpen] = useState(false);
  const [amountInput, setAmountInput] = useState("");

  const { data: earnings } = useQuery({
    queryKey: ["driver-earnings-summary", driverId],
    queryFn: getDriverEarningsSummary,
    enabled: !!driverId,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["driver-earnings-transactions", driverId],
    queryFn: () => getDriverEarningsTransactions(driverId!),
    enabled: !!driverId,
  });

  const { data: summary } = useQuery({
    queryKey: ["driver-payout-summary", driverId],
    queryFn: getDriverPayoutSummary,
    enabled: !!driverId,
  });

  const { data: payoutRequests = [] } = useQuery({
    queryKey: ["driver-payout-requests", driverId],
    queryFn: () => getDriverPayoutRequests(driverId!),
    enabled: !!driverId,
  });

  useEffect(() => {
    if (!driverId) return;
    return subscribePayoutRequests(driverId, () => {
      queryClient.invalidateQueries({ queryKey: ["driver-payout-requests", driverId] });
      queryClient.invalidateQueries({ queryKey: ["driver-payout-summary", driverId] });
    });
  }, [driverId, queryClient]);

  const payoutMutation = useMutation({
    mutationFn: (amount: number) => requestDriverPayout(amount),
    onSuccess: () => {
      toast.success("Đã gửi yêu cầu rút tiền, chờ admin duyệt và chuyển khoản.");
      queryClient.invalidateQueries({ queryKey: ["driver-payout-requests", driverId] });
      queryClient.invalidateQueries({ queryKey: ["driver-payout-summary", driverId] });
      setPayoutOpen(false);
      setAmountInput("");
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Không gửi được yêu cầu rút tiền."),
  });

  const available = summary?.available ?? 0;
  const amountValue = Number(amountInput);
  const canSubmit = amountValue > 0 && amountValue <= available;

  const handleSubmitPayout = () => {
    if (!canSubmit) return;
    payoutMutation.mutate(amountValue);
  };

  const todayGross = earnings?.todayGross ?? 0;
  const weekGross = earnings?.weekGross ?? 0;
  const monthGross = earnings?.monthGross ?? 0;
  const monthTrips = earnings?.monthTrips ?? 0;
  const monthFee = earnings?.monthFee ?? 0;
  const monthNet = earnings?.monthNet ?? 0;
  const now = new Date();
  const monthLabel = `Tháng ${now.getMonth() + 1}/${now.getFullYear()}`;

  return (
    <DriverShell>
      <div className="safe-top flex items-center gap-3 px-5 py-3">
        <Link to="/driver" className="grid h-10 w-10 place-items-center rounded-full bg-surface">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-black">Thu nhập</h1>
      </div>

      <div className="mx-5 rounded-3xl gradient-primary p-5 text-primary-foreground shadow-glow">
        <div className="text-xs font-semibold uppercase opacity-80">Doanh thu {monthLabel}</div>
        <div className="mt-2 text-3xl font-black">{formatVND(monthGross)}</div>
        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/20 pt-3 text-center text-xs">
          <div>
            <div className="opacity-80">Hôm nay</div>
            <div className="font-bold">{formatVND(todayGross)}</div>
          </div>
          <div>
            <div className="opacity-80">Tuần này</div>
            <div className="font-bold">{formatVND(weekGross)}</div>
          </div>
          <div>
            <div className="opacity-80">Thực nhận</div>
            <div className="font-bold">{formatVND(monthNet)}</div>
          </div>
        </div>
      </div>

      <div className="mx-5 mt-4 rounded-3xl bg-surface p-4 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Tổng chuyến tháng này</span>
          <span className="font-bold">{monthTrips}</span>
        </div>
        <div className="mt-1 flex justify-between">
          <span className="text-muted-foreground">Phí nền tảng (15%)</span>
          <span className="font-bold">-{formatVND(monthFee)}</span>
        </div>
        <div className="mt-1 flex justify-between">
          <span className="text-muted-foreground">Thu nhập thực nhận</span>
          <span className="font-black text-success">{formatVND(monthNet)}</span>
        </div>
        <div className="mt-1 flex justify-between border-t border-border/60 pt-2">
          <span className="text-muted-foreground">Số dư khả dụng để rút</span>
          <span className="font-black">{formatVND(available)}</span>
        </div>
        <button
          onClick={() => setPayoutOpen(true)}
          disabled={available <= 0}
          className="mt-3 w-full rounded-2xl gradient-primary py-3 text-sm font-bold text-primary-foreground shadow-glow disabled:opacity-50"
        >
          Yêu cầu rút tiền
        </button>
      </div>

      <h3 className="mb-2 mt-6 px-5 text-sm font-bold">Lịch sử giao dịch</h3>
      {transactions.length === 0 ? (
        <div className="mx-5 rounded-2xl bg-surface p-4 text-center text-xs text-muted-foreground">
          Chưa có chuyến nào hoàn thành.
        </div>
      ) : (
        <div className="mx-5 divide-y divide-border/60 overflow-hidden rounded-2xl bg-surface">
          {transactions.map((t) => (
            <div key={t.id} className="flex items-center justify-between p-4">
              <div>
                <div className="text-sm font-bold">{t.code}</div>
                <div className="text-xs text-muted-foreground">
                  {formatRelativeTime(t.completed_at)}
                </div>
              </div>
              <div className="text-sm font-black text-success">
                +{formatVND(Math.round(t.price * 0.85))}
              </div>
            </div>
          ))}
        </div>
      )}

      <h3 className="mb-2 mt-6 px-5 text-sm font-bold">Lịch sử yêu cầu rút tiền</h3>
      {payoutRequests.length === 0 ? (
        <div className="mx-5 rounded-2xl bg-surface p-4 text-center text-xs text-muted-foreground">
          Chưa có yêu cầu rút tiền nào.
        </div>
      ) : (
        <div className="mx-5 divide-y divide-border/60 overflow-hidden rounded-2xl bg-surface">
          {payoutRequests.map((r) => (
            <div key={r.id} className="flex items-center justify-between p-4">
              <div>
                <div className="text-sm font-bold">{formatVND(r.amount)}</div>
                <div className="text-xs text-muted-foreground">
                  {formatRelativeTime(r.created_at)}
                </div>
              </div>
              <div
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${PAYOUT_STATUS_TONE[r.status]}`}
              >
                {PAYOUT_STATUS_LABEL[r.status]}
              </div>
            </div>
          ))}
        </div>
      )}

      <Sheet open={payoutOpen} onOpenChange={setPayoutOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>Yêu cầu rút tiền</SheetTitle>
          </SheetHeader>
          <p className="mt-1 text-xs text-muted-foreground">
            Số dư khả dụng:{" "}
            <span className="font-bold text-foreground">{formatVND(available)}</span>. Admin sẽ
            duyệt và chuyển khoản thủ công sau khi bạn gửi yêu cầu.
          </p>
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-surface p-3">
            <input
              type="number"
              inputMode="numeric"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              placeholder="Nhập số tiền muốn rút"
              className="w-full bg-transparent text-sm font-bold outline-none"
            />
            <button
              onClick={() => setAmountInput(String(available))}
              className="shrink-0 rounded-full bg-background px-3 py-1.5 text-xs font-bold text-primary"
            >
              Rút tất cả
            </button>
          </div>
          {amountInput && !canSubmit && (
            <p className="mt-2 text-xs text-destructive">
              Số tiền phải lớn hơn 0 và không vượt quá số dư khả dụng.
            </p>
          )}
          <button
            onClick={handleSubmitPayout}
            disabled={!canSubmit || payoutMutation.isPending}
            className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-2xl gradient-primary py-3 text-sm font-bold text-primary-foreground shadow-glow disabled:opacity-50"
          >
            {payoutMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Gửi yêu cầu
          </button>
        </SheetContent>
      </Sheet>
    </DriverShell>
  );
}

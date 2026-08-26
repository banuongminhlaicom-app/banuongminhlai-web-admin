import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import {
  getDriverWalletsAdmin,
  getDriverWalletTransactionsAdmin,
  type DriverWalletTransactionRow,
} from "@/lib/queries";
import { formatRelativeTime, formatVND } from "@/lib/format";
import { useRequireRole } from "@/lib/auth";

export const Route = createFileRoute("/admin/driver-wallets")({
  head: () => ({ meta: [{ title: "Admin · Ví tài xế" }] }),
  component: AdminDriverWallets,
});

const TX_TYPE_LABEL: Record<DriverWalletTransactionRow["type"], string> = {
  topup: "Nạp tiền",
  trip_payment: "Chuyến đi",
  refund: "Hoàn tiền",
  adjustment: "Điều chỉnh",
};

function AdminDriverWallets() {
  useRequireRole("admin");

  const { data: wallets, isLoading: walletsLoading } = useQuery({
    queryKey: ["admin", "driver-wallets"],
    queryFn: getDriverWalletsAdmin,
  });

  const { data: transactions, isLoading: txLoading } = useQuery({
    queryKey: ["admin", "driver-wallet-transactions"],
    queryFn: () => getDriverWalletTransactionsAdmin(50),
  });

  const debtors = (wallets ?? []).filter((w) => w.balance < 0);
  const totalDebt = debtors.reduce((sum, w) => sum + -w.balance, 0);

  return (
    <AdminLayout title="Ví tài xế">
      <p className="mb-4 text-xs text-muted-foreground">
        Khách trả tiền mặt trực tiếp cho tài xế nên sau mỗi chuyến, tài xế nợ lại nền tảng 40% phí —
        số âm nghĩa là tài xế đang nợ, tài xế tự "Nạp tiền" trong app để trả bớt/trả hết.
      </p>

      <div className="mb-4 rounded-2xl bg-surface p-4">
        <div className="text-[10px] uppercase text-muted-foreground">Tổng nợ phí đang chờ thu</div>
        <div className="mt-1 text-xl font-black text-destructive">{formatVND(totalDebt)}</div>
      </div>

      <h2 className="mb-2 text-sm font-bold">Số dư ví theo tài xế</h2>
      {walletsLoading ? (
        <div className="grid h-32 place-items-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : !wallets || wallets.length === 0 ? (
        <div className="rounded-3xl bg-surface p-10 text-center text-sm text-muted-foreground">
          Chưa có tài xế nào có ví.
        </div>
      ) : (
        <div className="space-y-2">
          {wallets.map((w) => (
            <div key={w.owner_id} className="flex items-center justify-between rounded-2xl bg-surface p-4">
              <div className="min-w-0">
                <div className="text-sm font-bold">{w.driver_name ?? "Tài xế"}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  Cập nhật {formatRelativeTime(w.updated_at)}
                </div>
              </div>
              <div className={`text-sm font-black ${w.balance < 0 ? "text-destructive" : "text-success"}`}>
                {formatVND(w.balance)}
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="mb-2 mt-6 text-sm font-bold">Lịch sử giao dịch ví gần đây</h2>
      {txLoading ? (
        <div className="grid h-32 place-items-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : !transactions || transactions.length === 0 ? (
        <div className="rounded-3xl bg-surface p-10 text-center text-sm text-muted-foreground">
          Chưa có giao dịch ví nào.
        </div>
      ) : (
        <div className="space-y-2">
          {transactions.map((t) => (
            <div key={t.id} className="flex items-center justify-between rounded-2xl bg-surface p-4">
              <div className="min-w-0">
                <div className="text-sm font-bold">
                  {t.driver_name ?? "Tài xế"} · {TX_TYPE_LABEL[t.type]}
                </div>
                <div className="mt-0.5 truncate text-xs text-muted-foreground">
                  {t.description ?? "—"} · {formatRelativeTime(t.created_at)}
                </div>
              </div>
              <div className={`shrink-0 text-sm font-black ${t.amount < 0 ? "text-destructive" : "text-success"}`}>
                {t.amount > 0 ? "+" : ""}
                {formatVND(t.amount)}
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}

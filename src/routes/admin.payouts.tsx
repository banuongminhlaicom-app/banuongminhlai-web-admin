import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import {
  getPayoutRequestsAdmin,
  updatePayoutRequestStatus,
  type PayoutRequestStatus,
} from "@/lib/queries";
import { formatRelativeTime, formatVND } from "@/lib/format";
import { toast } from "sonner";
import { useRequireRole } from "@/lib/auth";

export const Route = createFileRoute("/admin/payouts")({
  head: () => ({ meta: [{ title: "Admin · Rút tiền tài xế" }] }),
  component: AdminPayouts,
});

const STATUS_LABEL: Record<PayoutRequestStatus, string> = {
  pending: "Đang chờ",
  paid: "Đã chuyển khoản",
  rejected: "Từ chối",
};

const STATUS_TONE: Record<PayoutRequestStatus, string> = {
  pending: "bg-warning/20 text-warning",
  paid: "bg-success/20 text-success",
  rejected: "bg-destructive/20 text-destructive",
};

function AdminPayouts() {
  useRequireRole("admin");
  const queryClient = useQueryClient();
  const { data: requests, isLoading } = useQuery({
    queryKey: ["admin", "payout-requests"],
    queryFn: getPayoutRequestsAdmin,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: PayoutRequestStatus }) =>
      updatePayoutRequestStatus(id, status),
    onSuccess: () => {
      toast.success("Đã cập nhật trạng thái");
      queryClient.invalidateQueries({ queryKey: ["admin", "payout-requests"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Không cập nhật được."),
  });

  return (
    <AdminLayout title="Yêu cầu rút tiền">
      <p className="mb-4 text-xs text-muted-foreground">
        Chuyển khoản thủ công cho tài xế qua ngân hàng/QR rồi đánh dấu "Đã chuyển khoản". Số tiền đã
        được hệ thống kiểm tra không vượt quá thu nhập thực tế của tài xế tại thời điểm gửi yêu cầu.
      </p>
      {isLoading ? (
        <div className="grid h-40 place-items-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : !requests || requests.length === 0 ? (
        <div className="rounded-3xl bg-surface p-10 text-center text-sm text-muted-foreground">
          Chưa có yêu cầu rút tiền nào.
        </div>
      ) : (
        <div className="space-y-2">
          {requests.map((r) => (
            <div key={r.id} className="rounded-2xl bg-surface p-4">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold">{formatVND(r.amount)}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {r.driver_name ?? "Tài xế"} · Gửi lúc {formatRelativeTime(r.created_at)}
                  </div>
                  {r.processed_at && (
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      Xử lý lúc {formatRelativeTime(r.processed_at)}
                    </div>
                  )}
                </div>
                <select
                  value={r.status}
                  onChange={(e) =>
                    statusMutation.mutate({
                      id: r.id,
                      status: e.target.value as PayoutRequestStatus,
                    })
                  }
                  disabled={statusMutation.isPending}
                  className={`shrink-0 rounded-full border-0 px-2 py-1 text-[10px] font-bold outline-none disabled:opacity-60 ${STATUS_TONE[r.status]}`}
                >
                  {(Object.keys(STATUS_LABEL) as PayoutRequestStatus[]).map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}

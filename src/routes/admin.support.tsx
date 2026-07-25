import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import {
  getSupportTickets,
  updateSupportTicketStatus,
  type SupportTicketStatus,
} from "@/lib/queries";
import { formatRelativeTime } from "@/lib/format";
import { toast } from "sonner";
import { useRequireRole } from "@/lib/auth";

export const Route = createFileRoute("/admin/support")({
  head: () => ({ meta: [{ title: "Admin · Hỗ trợ" }] }),
  component: AdminSupport,
});

const STATUS_LABEL: Record<SupportTicketStatus, string> = {
  new: "Mới",
  in_progress: "Đang xử lý",
  resolved: "Đã xử lý",
};

const STATUS_TONE: Record<SupportTicketStatus, string> = {
  new: "bg-primary/20 text-primary",
  in_progress: "bg-warning/20 text-warning",
  resolved: "bg-success/20 text-success",
};

function AdminSupport() {
  useRequireRole("admin");
  const queryClient = useQueryClient();
  const { data: tickets, isLoading } = useQuery({
    queryKey: ["admin", "support-tickets"],
    queryFn: getSupportTickets,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: SupportTicketStatus }) =>
      updateSupportTicketStatus(id, status),
    onSuccess: () => {
      toast.success("Đã cập nhật trạng thái");
      queryClient.invalidateQueries({ queryKey: ["admin", "support-tickets"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Không cập nhật được."),
  });

  return (
    <AdminLayout title="Yêu cầu hỗ trợ">
      {isLoading ? (
        <div className="grid h-40 place-items-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : !tickets || tickets.length === 0 ? (
        <div className="rounded-3xl bg-surface p-10 text-center text-sm text-muted-foreground">
          Chưa có yêu cầu hỗ trợ nào.
        </div>
      ) : (
        <div className="space-y-2">
          {tickets.map((t) => (
            <div key={t.id} className="rounded-2xl bg-surface p-4">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold">{t.subject}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {t.requester_name ?? "Người dùng"} · {formatRelativeTime(t.created_at)}
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                    {t.message}
                  </p>
                </div>
                <select
                  value={t.status}
                  onChange={(e) =>
                    statusMutation.mutate({
                      id: t.id,
                      status: e.target.value as SupportTicketStatus,
                    })
                  }
                  disabled={statusMutation.isPending}
                  className={`shrink-0 rounded-full border-0 px-2 py-1 text-[10px] font-bold outline-none disabled:opacity-60 ${STATUS_TONE[t.status]}`}
                >
                  {(Object.keys(STATUS_LABEL) as SupportTicketStatus[]).map((s) => (
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

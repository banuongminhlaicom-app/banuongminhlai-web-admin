import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { approveDriver, getDrivers } from "@/lib/queries";
import { toast } from "sonner";
import { useRequireRole } from "@/lib/auth";

export const Route = createFileRoute("/admin/drivers")({
  head: () => ({ meta: [{ title: "Admin · Tài xế" }] }),
  component: AdminDrivers,
});

function initials(name: string | null) {
  if (!name) return "TX";
  return name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function AdminDrivers() {
  useRequireRole("admin");
  const queryClient = useQueryClient();
  const { data: drivers, isLoading } = useQuery({
    queryKey: ["admin", "drivers"],
    queryFn: getDrivers,
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, approved }: { id: string; approved: boolean }) =>
      approveDriver(id, approved),
    onSuccess: (_data, vars) => {
      toast.success(vars.approved ? "Đã phê duyệt" : "Đã huỷ phê duyệt");
      queryClient.invalidateQueries({ queryKey: ["admin", "drivers"] });
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Không thực hiện được thao tác."),
  });

  return (
    <AdminLayout title="Quản lý tài xế">
      {isLoading ? (
        <div className="grid h-40 place-items-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : !drivers || drivers.length === 0 ? (
        <div className="rounded-3xl bg-surface p-10 text-center text-sm text-muted-foreground">
          Chưa có tài xế nào đăng ký.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {drivers.map((d) => (
            <div key={d.id} className="rounded-3xl bg-surface p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl gradient-primary font-black text-primary-foreground shadow-glow">
                  {initials(d.full_name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold">{d.full_name ?? "Chưa cập nhật tên"}</div>
                  <div className="text-xs text-muted-foreground">
                    {d.vehicle_class ? `Hạng ${d.vehicle_class} · ` : ""}
                    {d.years_experience} năm
                  </div>
                </div>
                <div
                  className={`rounded-full px-2 py-1 text-[10px] font-bold ${d.online ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"}`}
                >
                  ● {d.online ? "Online" : "Offline"}
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl bg-background p-3 text-center text-xs">
                <div>
                  <div className="text-muted-foreground">Chuyến</div>
                  <div className="font-bold">{d.trips_count}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Đánh giá</div>
                  <div className="font-bold">{d.rating} ★</div>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => toast("Đã mở hồ sơ chi tiết")}
                  className="flex-1 rounded-xl bg-background py-2 text-xs font-bold"
                >
                  Chi tiết
                </button>
                <button
                  onClick={() => approveMutation.mutate({ id: d.id, approved: !d.approved })}
                  disabled={approveMutation.isPending}
                  className={`flex-1 rounded-xl py-2 text-xs font-bold disabled:opacity-60 ${
                    d.approved
                      ? "bg-background text-muted-foreground"
                      : "gradient-primary text-primary-foreground"
                  }`}
                >
                  {d.approved ? "Đã phê duyệt ✓" : "Phê duyệt"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}

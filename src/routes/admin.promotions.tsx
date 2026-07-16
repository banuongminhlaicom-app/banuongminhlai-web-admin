import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { getPromotions } from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import { formatVND } from "@/lib/format";
import { toast } from "sonner";
import { useRequireRole } from "@/lib/auth";

export const Route = createFileRoute("/admin/promotions")({
  head: () => ({ meta: [{ title: "Admin · Ưu đãi" }] }),
  component: AdminPromos,
});

async function togglePromotionActive(id: string, active: boolean) {
  if (!supabase) throw new Error("Supabase chưa được cấu hình.");
  const { error } = await supabase.from("promotions").update({ active }).eq("id", id);
  if (error) throw error;
}

function AdminPromos() {
  useRequireRole("admin");
  const queryClient = useQueryClient();
  const { data: promotions, isLoading } = useQuery({
    queryKey: ["admin", "promotions"],
    queryFn: getPromotions,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      togglePromotionActive(id, active),
    onSuccess: () => {
      toast.success("Đã cập nhật trạng thái mã ưu đãi");
      queryClient.invalidateQueries({ queryKey: ["admin", "promotions"] });
      queryClient.invalidateQueries({ queryKey: ["promotions"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Không cập nhật được."),
  });

  return (
    <AdminLayout title="Quản lý mã ưu đãi">
      {isLoading ? (
        <div className="grid h-40 place-items-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-muted-foreground">
                <th className="p-4">Mã</th>
                <th className="p-4">Tiêu đề</th>
                <th className="p-4">Giảm</th>
                <th className="p-4">HSD</th>
                <th className="p-4">Trạng thái</th>
                <th className="p-4">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {!promotions || promotions.length === 0 ? (
                <tr>
                  <td className="p-6 text-center text-muted-foreground" colSpan={6}>
                    Chưa có mã ưu đãi nào.
                  </td>
                </tr>
              ) : (
                promotions.map((p) => (
                  <tr key={p.id}>
                    <td className="p-4 font-mono font-bold">{p.code}</td>
                    <td className="p-4">{p.title}</td>
                    <td className="p-4 font-black text-primary">-{formatVND(p.discount)}</td>
                    <td className="p-4 text-muted-foreground">
                      {p.expires_at ? new Date(p.expires_at).toLocaleDateString("vi-VN") : "—"}
                    </td>
                    <td className="p-4">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${p.active ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"}`}
                      >
                        {p.active ? "Đang hoạt động" : "Ngừng hoạt động"}
                      </span>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => toggleMutation.mutate({ id: p.id, active: !p.active })}
                        disabled={toggleMutation.isPending}
                        className="rounded-md bg-background px-2 py-1 text-xs disabled:opacity-60"
                      >
                        {p.active ? "Ngừng" : "Kích hoạt"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}

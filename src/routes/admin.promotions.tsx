import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/AdminLayout";
import { MOCK_PROMOTIONS } from "@/lib/mock";
import { formatVND } from "@/lib/format";

export const Route = createFileRoute("/admin/promotions")({
  head: () => ({ meta: [{ title: "Admin · Ưu đãi" }] }),
  component: AdminPromos,
});

function AdminPromos() {
  return (
    <AdminLayout title="Quản lý mã ưu đãi">
      <div className="overflow-hidden rounded-3xl bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-muted-foreground">
              <th className="p-4">Mã</th>
              <th className="p-4">Tiêu đề</th>
              <th className="p-4">Giảm</th>
              <th className="p-4">HSD</th>
              <th className="p-4">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {MOCK_PROMOTIONS.map((p) => (
              <tr key={p.id}>
                <td className="p-4 font-mono font-bold">{p.code}</td>
                <td className="p-4">{p.title}</td>
                <td className="p-4 font-black text-primary">-{formatVND(p.discount)}</td>
                <td className="p-4 text-muted-foreground">{p.expiresAt}</td>
                <td className="p-4">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${p.used ? "bg-muted text-muted-foreground" : "bg-success/20 text-success"}`}>
                    {p.used ? "Đã dùng" : "Đang hoạt động"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}

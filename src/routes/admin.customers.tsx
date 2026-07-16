import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { getCustomers } from "@/lib/queries";
import { useRequireRole } from "@/lib/auth";

export const Route = createFileRoute("/admin/customers")({
  head: () => ({ meta: [{ title: "Admin · Khách hàng" }] }),
  component: AdminCustomers,
});

function AdminCustomers() {
  useRequireRole("admin");
  const { data: customers, isLoading } = useQuery({
    queryKey: ["admin", "customers"],
    queryFn: getCustomers,
  });

  return (
    <AdminLayout title="Quản lý khách hàng">
      {isLoading ? (
        <div className="grid h-40 place-items-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-muted-foreground">
                <th className="p-4">Khách hàng</th>
                <th className="p-4">SĐT</th>
                <th className="p-4">Số chuyến</th>
                <th className="p-4">Ngày tham gia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {!customers || customers.length === 0 ? (
                <tr>
                  <td className="p-6 text-center text-muted-foreground" colSpan={4}>
                    Chưa có khách hàng nào đăng ký.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id}>
                    <td className="p-4 font-semibold">{c.full_name ?? "Chưa cập nhật tên"}</td>
                    <td className="p-4 text-muted-foreground">{c.phone ?? "—"}</td>
                    <td className="p-4 font-black">—</td>
                    <td className="p-4 text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString("vi-VN")}
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

import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/AdminLayout";
import { MOCK_CUSTOMERS } from "@/lib/mock";

export const Route = createFileRoute("/admin/customers")({
  head: () => ({ meta: [{ title: "Admin · Khách hàng" }] }),
  component: AdminCustomers,
});

function AdminCustomers() {
  return (
    <AdminLayout title="Quản lý khách hàng">
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
            {MOCK_CUSTOMERS.map((c) => (
              <tr key={c.id}>
                <td className="p-4 font-semibold">{c.name}</td>
                <td className="p-4 text-muted-foreground">{c.phone}</td>
                <td className="p-4 font-black">{c.trips}</td>
                <td className="p-4 text-muted-foreground">{c.joined}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}

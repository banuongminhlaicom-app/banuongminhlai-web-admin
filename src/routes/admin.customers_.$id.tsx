import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, ShieldAlert } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { getCustomerDetail, getCustomerKyc, getTripsByCustomer } from "@/lib/queries";
import { TRIP_STATUS_LABEL, type TripStatus } from "@/lib/mock";
import { formatVND, formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useRequireRole } from "@/lib/auth";

export const Route = createFileRoute("/admin/customers_/$id")({
  head: () => ({ meta: [{ title: "Admin · Chi tiết khách hàng" }] }),
  component: AdminCustomerDetail,
});

function initials(name: string | null) {
  if (!name) return "KH";
  return name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function AdminCustomerDetail() {
  useRequireRole("admin");
  const { id } = Route.useParams();

  const { data: customer, isLoading } = useQuery({
    queryKey: ["admin", "customer", id],
    queryFn: () => getCustomerDetail(id),
  });
  const { data: trips = [] } = useQuery({
    queryKey: ["admin", "customer-trips", id],
    queryFn: () => getTripsByCustomer(id),
  });
  // Ảnh CCCD khách hàng — riêng tư, chỉ chính chủ + admin xem được (RLS
  // stage20). Dùng để đối chiếu bằng mắt, chưa có OCR/face-match tự động.
  const { data: kyc } = useQuery({
    queryKey: ["admin", "customer-kyc", id],
    queryFn: () => getCustomerKyc(id),
  });

  return (
    <AdminLayout title="Chi tiết khách hàng">
      <Link
        to="/admin/customers"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Về danh sách khách hàng
      </Link>

      {isLoading ? (
        <div className="grid h-40 place-items-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : !customer ? (
        <div className="rounded-3xl bg-surface p-8 text-center text-sm text-muted-foreground">
          Không tìm thấy khách hàng này.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-3xl bg-surface p-5">
            <div className="flex flex-wrap items-center gap-4">
              {customer.avatar_url ? (
                <img
                  src={customer.avatar_url}
                  alt={customer.full_name ?? "Khách hàng"}
                  className="h-16 w-16 shrink-0 rounded-2xl object-cover shadow-glow"
                />
              ) : (
                <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl gradient-primary text-lg font-black text-primary-foreground shadow-glow">
                  {initials(customer.full_name)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-lg font-black">
                  {customer.full_name ?? "Chưa cập nhật tên"}
                </div>
                <div className="text-sm text-muted-foreground">
                  {customer.phone ?? "Chưa có số điện thoại"}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Tham gia {new Date(customer.created_at).toLocaleDateString("vi-VN")}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat label="Đánh giá" value={`${customer.rating.toFixed(1)} ★`} />
            <Stat label="Tổng chuyến" value={String(customer.trips_count)} />
            <Stat label="Điểm thưởng" value={String(customer.points)} />
          </div>

          <div className="rounded-3xl bg-surface p-5">
            <h3 className="mb-1 text-xs font-black uppercase text-muted-foreground">
              Giấy tờ xác minh (CCCD)
            </h3>
            <p className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
              Đối chiếu ảnh CCCD với hồ sơ bằng mắt — chưa có OCR/xác thực tự động.
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <DocThumb label="CCCD mặt trước" url={kyc?.id_photo_url ?? null} />
              <DocThumb label="CCCD mặt sau" url={kyc?.id_photo_back_url ?? null} />
            </div>
            {kyc?.id_number && (
              <div className="mt-3 flex justify-between rounded-xl bg-background p-2.5 text-sm">
                <span className="text-muted-foreground">Số CCCD</span>
                <span className="font-mono font-semibold">{kyc.id_number}</span>
              </div>
            )}
          </div>

          <div className="rounded-3xl bg-surface p-5">
            <h3 className="mb-3 text-xs font-black uppercase text-muted-foreground">
              Chuyến gần đây
            </h3>
            {trips.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Khách hàng chưa có chuyến nào.
              </div>
            ) : (
              <div className="space-y-2">
                {trips.map((t) => (
                  <Link
                    key={t.id}
                    to="/admin/bookings/$id"
                    params={{ id: t.id }}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-background p-3 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{t.dropoff_address}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatRelativeTime(t.created_at)}
                      </div>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold",
                        t.status === "completed" && "bg-success/20 text-success",
                        t.status === "cancelled" && "bg-destructive/20 text-destructive",
                        !["completed", "cancelled"].includes(t.status) &&
                          "bg-primary/20 text-primary",
                      )}
                    >
                      {TRIP_STATUS_LABEL[t.status as TripStatus]}
                    </span>
                    <span className="shrink-0 font-black text-primary">{formatVND(t.price)}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl bg-surface p-4 text-center">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-black">{value}</div>
    </div>
  );
}

// Ảnh giấy tờ dùng signed URL (hết hạn sau 1 giờ) — bấm để xem cỡ đầy đủ ở
// tab mới thay vì phóng to trong trang, đỡ phải tự dựng lightbox.
function DocThumb({ label, url }: { label: string; url: string | null }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-background">
      {url ? (
        <a href={url} target="_blank" rel="noreferrer" className="block">
          <img src={url} alt={label} className="aspect-[4/3] w-full object-cover" />
        </a>
      ) : (
        <div className="grid aspect-[4/3] w-full place-items-center text-[11px] text-muted-foreground">
          Chưa tải lên
        </div>
      )}
      <div className="p-2 text-center text-[11px] font-semibold text-muted-foreground">{label}</div>
    </div>
  );
}

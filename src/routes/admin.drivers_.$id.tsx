import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, ImagePlus, Loader2, ShieldAlert, Trash2 } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import {
  approveDriver,
  deleteDriverDoc,
  type DriverDocKind,
  getDriverAdminDetail,
  getDriverKyc,
  getTripsByDriver,
  uploadDriverDoc,
} from "@/lib/queries";
import { TRIP_STATUS_LABEL, type TripStatus } from "@/lib/mock";
import { formatVND, formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRequireRole } from "@/lib/auth";

export const Route = createFileRoute("/admin/drivers_/$id")({
  head: () => ({ meta: [{ title: "Admin · Chi tiết tài xế" }] }),
  component: AdminDriverDetail,
});

const STATUS_LABEL: Record<string, string> = {
  offline: "Ngoại tuyến",
  online: "Đang trực tuyến",
  assigned: "Đã nhận chuyến",
  arriving: "Đang tới đón",
  arrived: "Đã tới điểm đón",
  in_progress: "Đang chở khách",
};

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

function AdminDriverDetail() {
  useRequireRole("admin");
  const { id } = Route.useParams();
  const queryClient = useQueryClient();

  const { data: driver, isLoading } = useQuery({
    queryKey: ["admin", "driver", id],
    queryFn: () => getDriverAdminDetail(id),
  });
  const { data: trips = [] } = useQuery({
    queryKey: ["admin", "driver-trips", id],
    queryFn: () => getTripsByDriver(id),
  });
  // Ảnh giấy tờ tuỳ thân — riêng tư, chỉ chính chủ + admin xem được (RLS
  // stage18). Dùng để đối chiếu bằng mắt khi chưa có OCR/face-match tự động.
  const { data: kyc } = useQuery({
    queryKey: ["admin", "driver-kyc", id],
    queryFn: () => getDriverKyc(id),
  });
  const invalidateKyc = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "driver-kyc", id] });
  };

  const approveMutation = useMutation({
    mutationFn: (approved: boolean) => approveDriver(id, approved),
    onSuccess: (_data, approved) => {
      toast.success(approved ? "Đã phê duyệt" : "Đã huỷ phê duyệt");
      queryClient.invalidateQueries({ queryKey: ["admin", "driver", id] });
      queryClient.invalidateQueries({ queryKey: ["admin", "drivers"] });
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Không thực hiện được thao tác."),
  });

  return (
    <AdminLayout title="Chi tiết tài xế">
      <Link
        to="/admin/drivers"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Về danh sách tài xế
      </Link>

      {isLoading ? (
        <div className="grid h-40 place-items-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : !driver ? (
        <div className="rounded-3xl bg-surface p-8 text-center text-sm text-muted-foreground">
          Không tìm thấy tài xế này.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-3xl bg-surface p-5">
            <div className="flex flex-wrap items-center gap-4">
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl gradient-primary text-lg font-black text-primary-foreground shadow-glow">
                {initials(driver.full_name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-lg font-black">{driver.full_name ?? "Chưa cập nhật tên"}</div>
                <div className="text-sm text-muted-foreground">
                  {driver.phone ?? "Chưa có số điện thoại"}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 font-bold",
                      driver.online
                        ? "bg-success/20 text-success"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    ● {driver.online ? "Online" : "Offline"}
                  </span>
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 font-bold text-primary">
                    {STATUS_LABEL[driver.status] ?? driver.status}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 font-bold",
                      driver.approved ? "bg-success/20 text-success" : "bg-warning/20 text-warning",
                    )}
                  >
                    {driver.approved ? "Đã phê duyệt" : "Chưa phê duyệt"}
                  </span>
                </div>
              </div>
              <button
                onClick={() => approveMutation.mutate(!driver.approved)}
                disabled={approveMutation.isPending}
                className={cn(
                  "shrink-0 rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-60",
                  driver.approved
                    ? "bg-background text-muted-foreground"
                    : "gradient-primary text-primary-foreground shadow-glow",
                )}
              >
                {approveMutation.isPending && (
                  <Loader2 className="mr-1.5 inline h-3.5 w-3.5 animate-spin" />
                )}
                {driver.approved ? "Huỷ phê duyệt" : "Phê duyệt"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Đánh giá" value={`${driver.rating} ★`} />
            <Stat label="Tổng chuyến" value={String(driver.trips_count)} />
            <Stat label="Chuyến hôm nay" value={String(driver.today_trips)} />
            <Stat label="Doanh thu hôm nay" value={formatVND(driver.today_revenue)} />
          </div>

          <div className="rounded-3xl bg-surface p-5">
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div className="flex justify-between rounded-xl bg-background p-2.5">
                <dt className="text-muted-foreground">Hạng xe</dt>
                <dd className="font-semibold">{driver.vehicle_class ?? "—"}</dd>
              </div>
              <div className="flex justify-between rounded-xl bg-background p-2.5">
                <dt className="text-muted-foreground">Kinh nghiệm</dt>
                <dd className="font-semibold">{driver.years_experience} năm</dd>
              </div>
              <div className="flex justify-between rounded-xl bg-background p-2.5">
                <dt className="text-muted-foreground">Tự động nhận chuyến</dt>
                <dd className="font-semibold">{driver.auto_accept ? "Bật" : "Tắt"}</dd>
              </div>
              <div className="flex justify-between rounded-xl bg-background p-2.5">
                <dt className="text-muted-foreground">Mã tài xế</dt>
                <dd className="font-mono text-xs">{driver.id}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-3xl bg-surface p-5">
            <h3 className="mb-1 text-xs font-black uppercase text-muted-foreground">
              Giấy tờ xác minh (eKYC)
            </h3>
            <p className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
              Đối chiếu ảnh selfie với ảnh trên CCCD/GPLX bằng mắt trước khi phê duyệt.
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <DocThumb label="Selfie" url={kyc?.selfie_url ?? null} />
              <DocThumb label="CCCD mặt trước" url={kyc?.id_photo_url ?? null} />
              <DocThumb label="CCCD mặt sau" url={kyc?.id_photo_back_url ?? null} />
              <DocThumb label="GPLX mặt trước" url={kyc?.license_photo_url ?? null} />
              <DocThumb label="GPLX mặt sau" url={kyc?.license_photo_back_url ?? null} />
            </div>
            {kyc?.id_number && (
              <div className="mt-3 flex justify-between rounded-xl bg-background p-2.5 text-sm">
                <span className="text-muted-foreground">Số CCCD</span>
                <span className="font-mono font-semibold">{kyc.id_number}</span>
              </div>
            )}
          </div>

          <div className="rounded-3xl bg-surface p-5">
            <h3 className="mb-1 text-xs font-black uppercase text-muted-foreground">
              Tài liệu do Admin bổ sung
            </h3>
            <p className="mb-3 text-xs text-muted-foreground">
              Hạnh kiểm xác nhận địa phương + lý lịch tư pháp do admin thu thập và lưu vào hồ sơ tài
              xế này.
            </p>
            <DocUploadRow
              label="Hạnh kiểm xác nhận địa phương"
              driverId={id}
              kind="conduct_cert"
              facing="environment"
              photoUrl={kyc?.conduct_cert_url ?? null}
              photoPath={kyc?.conduct_cert_path ?? null}
              onUploaded={invalidateKyc}
            />
            <DocUploadRow
              label="Lý lịch tư pháp"
              driverId={id}
              kind="background_check"
              facing="environment"
              photoUrl={kyc?.background_check_url ?? null}
              photoPath={kyc?.background_check_path ?? null}
              onUploaded={invalidateKyc}
            />
          </div>

          <div className="rounded-3xl bg-surface p-5">
            <h3 className="mb-3 text-xs font-black uppercase text-muted-foreground">
              Chuyến gần đây
            </h3>
            {trips.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Tài xế chưa có chuyến nào.
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

// Ảnh tài liệu do admin bổ sung (hạnh kiểm/lý lịch tư pháp), upload thẳng lên
// bucket private "driver-docs" khi chọn file. Port từ DocUploadRow trong
// route driver.profile.tsx (đã xoá cùng phần app khách hàng/tài xế trên web —
// mobile app đảm nhiệm phần đó) — chỉ còn admin dùng để bổ sung hồ sơ.
function DocUploadRow({
  label,
  driverId,
  kind,
  facing,
  photoUrl,
  photoPath,
  onUploaded,
}: {
  label: string;
  driverId: string;
  kind: DriverDocKind;
  facing: "user" | "environment";
  photoUrl: string | null;
  photoPath: string | null;
  onUploaded: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      await uploadDriverDoc(driverId, kind, file);
      toast.success(`Đã tải ${label.toLowerCase()}`);
      onUploaded();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không tải được ảnh.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async () => {
    if (!photoPath) return;
    setDeleting(true);
    try {
      await deleteDriverDoc(driverId, kind, photoPath);
      toast.success(`Đã xoá ${label.toLowerCase()}`);
      onUploaded();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không xoá được ảnh.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mt-3 rounded-2xl bg-surface p-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          {photoUrl && <CheckCircle2 className="h-4 w-4 text-success" />}
          {label}
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture={facing}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || deleting}
            className="flex items-center gap-1.5 rounded-full bg-background px-3 py-1.5 text-xs font-bold disabled:opacity-60"
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ImagePlus className="h-3.5 w-3.5" />
            )}
            {photoUrl ? "Đổi ảnh" : "Tải ảnh"}
          </button>
          {photoUrl && (
            <button
              onClick={handleDelete}
              disabled={uploading || deleting}
              aria-label={`Xoá ${label.toLowerCase()}`}
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-destructive/15 text-destructive disabled:opacity-60"
            >
              {deleting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </button>
          )}
        </div>
      </div>
      {photoUrl && (
        <img src={photoUrl} alt={label} className="mt-3 h-32 w-full rounded-xl object-cover" />
      )}
    </div>
  );
}

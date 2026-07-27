import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  ImagePlus,
  Loader2,
  LogOut,
  Pencil,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { DriverShell } from "@/components/DriverShell";
import { ThemeToggle } from "@/components/ThemeToggle";
import { refreshProfile, signOutAuth, useAuthState, useRequireRole } from "@/lib/auth";
import {
  deleteDriverDoc,
  type DriverDocKind,
  getDriverKyc,
  getDriverSelf,
  updateDriverKyc,
  updateMyProfile,
  uploadAvatar,
  uploadDriverDoc,
  type DriverKycRow,
} from "@/lib/queries";

export const Route = createFileRoute("/driver/profile")({
  head: () => ({ meta: [{ title: "Hồ sơ tài xế" }] }),
  component: DriverProfile,
});

function formatExpiry(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("vi-VN", { month: "2-digit", year: "numeric" });
}

function DriverProfile() {
  useRequireRole("driver");
  const navigate = useNavigate();
  const authState = useAuthState();
  const driverId = authState.session?.user.id;
  const { data: driverSelf } = useQuery({
    queryKey: ["driver-self", driverId],
    queryFn: () => getDriverSelf(driverId!),
    enabled: !!driverId,
  });
  const { data: kyc } = useQuery({
    queryKey: ["driver-kyc", driverId],
    queryFn: () => getDriverKyc(driverId!),
    enabled: !!driverId,
  });
  const fullName = authState.profile?.full_name ?? "Tài xế";
  const initials = fullName
    .split(" ")
    .slice(-2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  const [editing, setEditing] = useState(false);

  const logout = async () => {
    await signOutAuth();
    toast("Đã đăng xuất khỏi tài khoản tài xế");
    navigate({ to: "/driver/login" });
  };

  const expiry = formatExpiry(kyc?.license_expiry ?? null);
  const docs = [
    {
      label: "Ảnh xác thực khuôn mặt (selfie)",
      value: kyc?.selfie_url ? "Đã tải lên" : "Chưa cập nhật",
      verified: !!kyc?.selfie_url,
    },
    { label: "Họ tên", value: fullName, verified: !!authState.profile?.full_name },
    {
      label: "Số điện thoại",
      value: authState.profile?.phone ?? "—",
      verified: !!authState.profile?.phone,
    },
    {
      label: "Căn cước công dân",
      value: kyc?.id_number ?? "Chưa cập nhật",
      verified: !!kyc?.id_number && !!kyc?.id_photo_url && !!kyc?.id_photo_back_url,
    },
    {
      label: "Giấy phép lái xe",
      value: kyc?.license_class
        ? `Hạng ${kyc.license_class}${expiry ? ` · HSD ${expiry}` : ""}`
        : "Chưa cập nhật",
      verified: !!kyc?.license_class && !!kyc?.license_photo_url && !!kyc?.license_photo_back_url,
    },
    {
      label: "Kinh nghiệm lái xe",
      value: `${kyc?.years_experience ?? 0} năm`,
      verified: (kyc?.years_experience ?? 0) > 0,
    },
    {
      label: "Người liên hệ khẩn cấp",
      value: kyc?.emergency_contact_name
        ? `${kyc.emergency_contact_name}${kyc.emergency_contact_phone ? ` · ${kyc.emergency_contact_phone}` : ""}`
        : "Chưa cập nhật",
      verified: !!kyc?.emergency_contact_name,
    },
  ];

  return (
    <DriverShell>
      <div className="safe-top flex items-center gap-3 px-5 py-3">
        <Link to="/driver" className="grid h-10 w-10 place-items-center rounded-full bg-surface">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-black">Tài khoản</h1>
      </div>

      <div className="mx-5 rounded-3xl bg-surface p-5 text-center shadow-elevated">
        <div className="relative mx-auto w-fit">
          {authState.profile?.avatar_url ? (
            <img
              src={authState.profile.avatar_url}
              alt={fullName}
              className="mx-auto h-20 w-20 rounded-3xl object-cover shadow-glow"
            />
          ) : (
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl gradient-primary text-2xl font-black text-primary-foreground shadow-glow">
              {initials || "TX"}
            </div>
          )}
          <button
            onClick={() => setEditing(true)}
            aria-label="Chỉnh sửa hồ sơ"
            className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-foreground shadow-elevated"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="mt-3 text-lg font-black">{fullName}</div>
        <div className="text-xs text-muted-foreground">Tài xế · Cao Lãnh, Đồng Tháp</div>
        <div className="mt-3 flex items-center justify-center gap-4 text-xs">
          <span className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-warning text-warning" />
            <b>{(driverSelf?.rating ?? 5).toFixed(1).replace(".", ",")}</b> đánh giá
          </span>
          <span className="text-muted-foreground">
            {driverSelf?.today_trips ?? 0} chuyến hôm nay
          </span>
        </div>
        <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-success/20 px-3 py-1 text-xs font-bold text-success">
          <CheckCircle2 className="h-3 w-3" /> Hồ sơ đã được phê duyệt
        </div>
      </div>

      <div className="mx-5 mt-4 overflow-hidden rounded-2xl bg-surface">
        <ThemeToggle variant="row" />
      </div>

      <div className="mx-5 mt-4 divide-y divide-border/60 overflow-hidden rounded-2xl bg-surface">
        {docs.map((d) => (
          <div key={d.label} className="flex items-center justify-between p-4">
            <div>
              <div className="text-xs text-muted-foreground">{d.label}</div>
              <div className="mt-0.5 text-sm font-bold">{d.value}</div>
            </div>
            {d.verified && <CheckCircle2 className="h-5 w-5 text-success" />}
          </div>
        ))}
      </div>

      <button
        onClick={() => setEditing(true)}
        className="mx-5 mt-4 flex w-[calc(100%-2.5rem)] items-center justify-center gap-2 rounded-2xl border border-border py-3.5 text-sm font-bold"
      >
        <Pencil className="h-4 w-4" /> Cập nhật hồ sơ & giấy tờ
      </button>

      <button
        onClick={logout}
        className="mx-5 mt-3 flex w-[calc(100%-2.5rem)] items-center justify-center gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 py-3.5 text-sm font-bold text-destructive"
      >
        <LogOut className="h-4 w-4" /> Đăng xuất
      </button>

      {editing && driverId && (
        <EditDriverProfileModal
          driverId={driverId}
          fullName={fullName}
          avatarUrl={authState.profile?.avatar_url ?? null}
          kyc={kyc ?? null}
          onClose={() => setEditing(false)}
        />
      )}
    </DriverShell>
  );
}

function EditDriverProfileModal({
  driverId,
  fullName,
  avatarUrl,
  kyc,
  onClose,
}: {
  driverId: string;
  fullName: string;
  avatarUrl: string | null;
  kyc: DriverKycRow | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState(avatarUrl);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const [name, setName] = useState(fullName);
  const [idNumber, setIdNumber] = useState(kyc?.id_number ?? "");
  const [licenseClass, setLicenseClass] = useState(kyc?.license_class ?? "");
  const [licenseExpiry, setLicenseExpiry] = useState(kyc?.license_expiry ?? "");
  const [yearsExperience, setYearsExperience] = useState(String(kyc?.years_experience ?? 0));
  const [emergencyName, setEmergencyName] = useState(kyc?.emergency_contact_name ?? "");
  const [emergencyPhone, setEmergencyPhone] = useState(kyc?.emergency_contact_phone ?? "");
  const [saving, setSaving] = useState(false);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["driver-kyc", driverId] });
  };

  const pickAvatar = async (file: File) => {
    setAvatarUploading(true);
    try {
      const url = await uploadAvatar(driverId, file);
      setAvatarPreview(url);
      await refreshProfile();
      toast.success("Đã cập nhật ảnh chân dung");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không tải được ảnh.");
    } finally {
      setAvatarUploading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  const save = async () => {
    if (!name.trim()) {
      toast.error("Vui lòng nhập họ tên.");
      return;
    }
    setSaving(true);
    try {
      await updateMyProfile(driverId, { full_name: name.trim() });
      await updateDriverKyc(driverId, {
        id_number: idNumber.trim() || undefined,
        license_class: licenseClass.trim() || undefined,
        license_expiry: licenseExpiry || undefined,
        years_experience: Number(yearsExperience) || 0,
        emergency_contact_name: emergencyName.trim() || undefined,
        emergency_contact_phone: emergencyPhone.trim() || undefined,
      });
      await refreshProfile();
      invalidateAll();
      toast.success("Đã lưu hồ sơ");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không lưu được hồ sơ.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50" onClick={onClose}>
      <div
        className="safe-bottom max-h-[88vh] w-full overflow-y-auto rounded-t-3xl bg-background p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="text-base font-black">Cập nhật hồ sơ & giấy tờ</div>
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="grid h-8 w-8 place-items-center rounded-full bg-surface"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex justify-center">
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) pickAvatar(file);
            }}
          />
          <button
            onClick={() => avatarInputRef.current?.click()}
            disabled={avatarUploading}
            className="relative"
            aria-label="Đổi ảnh chân dung"
          >
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="Ảnh chân dung"
                className="h-20 w-20 rounded-2xl object-cover shadow-glow"
              />
            ) : (
              <div className="grid h-20 w-20 place-items-center rounded-2xl gradient-primary text-xl font-black text-primary-foreground shadow-glow">
                {(name || "TX").slice(0, 2).toUpperCase()}
              </div>
            )}
            <span className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-foreground shadow-elevated">
              {avatarUploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Pencil className="h-3.5 w-3.5" />
              )}
            </span>
          </button>
        </div>

        <Field label="Họ tên" value={name} onChange={setName} placeholder="Nhập họ tên" />

        <div className="mt-4 text-xs font-bold uppercase text-muted-foreground">
          Xác thực khuôn mặt
        </div>
        <DocUploadRow
          label="Ảnh chân dung (selfie)"
          driverId={driverId}
          kind="selfie"
          facing="user"
          photoUrl={kyc?.selfie_url ?? null}
          photoPath={kyc?.selfie_path ?? null}
          onUploaded={invalidateAll}
        />

        <div className="mt-4 text-xs font-bold uppercase text-muted-foreground">
          Căn cước công dân
        </div>
        <Field label="Số CCCD" value={idNumber} onChange={setIdNumber} placeholder="079xxxxxxxxx" />
        <DocUploadRow
          label="Mặt trước CCCD"
          driverId={driverId}
          kind="id_front"
          facing="environment"
          photoUrl={kyc?.id_photo_url ?? null}
          photoPath={kyc?.id_photo_path ?? null}
          onUploaded={invalidateAll}
        />
        <DocUploadRow
          label="Mặt sau CCCD"
          driverId={driverId}
          kind="id_back"
          facing="environment"
          photoUrl={kyc?.id_photo_back_url ?? null}
          photoPath={kyc?.id_photo_back_path ?? null}
          onUploaded={invalidateAll}
        />

        <div className="mt-4 text-xs font-bold uppercase text-muted-foreground">
          Giấy phép lái xe
        </div>
        <Field
          label="Hạng bằng"
          value={licenseClass}
          onChange={setLicenseClass}
          placeholder="VD: B2"
        />
        <div className="mt-3">
          <div className="mb-1.5 text-xs font-semibold text-muted-foreground">Hạn sử dụng</div>
          <input
            type="date"
            value={licenseExpiry}
            onChange={(e) => setLicenseExpiry(e.target.value)}
            className="w-full rounded-2xl bg-surface p-3.5 text-base outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <DocUploadRow
          label="Mặt trước GPLX"
          driverId={driverId}
          kind="license_front"
          facing="environment"
          photoUrl={kyc?.license_photo_url ?? null}
          photoPath={kyc?.license_photo_path ?? null}
          onUploaded={invalidateAll}
        />
        <DocUploadRow
          label="Mặt sau GPLX"
          driverId={driverId}
          kind="license_back"
          facing="environment"
          photoUrl={kyc?.license_photo_back_url ?? null}
          photoPath={kyc?.license_photo_back_path ?? null}
          onUploaded={invalidateAll}
        />

        <div className="mt-4 text-xs font-bold uppercase text-muted-foreground">Khác</div>
        <div className="mt-3">
          <div className="mb-1.5 text-xs font-semibold text-muted-foreground">
            Kinh nghiệm lái xe (năm)
          </div>
          <input
            type="number"
            min={0}
            value={yearsExperience}
            onChange={(e) => setYearsExperience(e.target.value)}
            className="w-full rounded-2xl bg-surface p-3.5 text-base outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <Field
          label="Người liên hệ khẩn cấp"
          value={emergencyName}
          onChange={setEmergencyName}
          placeholder="Họ tên"
        />
        <Field
          label="SĐT liên hệ khẩn cấp"
          value={emergencyPhone}
          onChange={setEmergencyPhone}
          placeholder="09xxxxxxxx"
        />

        <button
          onClick={save}
          disabled={saving}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl gradient-primary py-3.5 text-sm font-bold text-primary-foreground shadow-glow disabled:opacity-60"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Lưu thay đổi
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="mt-3">
      <div className="mb-1.5 text-xs font-semibold text-muted-foreground">{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl bg-surface p-3.5 text-base outline-none focus:ring-2 focus:ring-primary/40"
      />
    </div>
  );
}

// Ảnh CCCD/GPLX upload thẳng lên bucket private "driver-docs" khi chọn file
// (không đợi bấm "Lưu thay đổi") — giống BannerImageCell ở admin.promotions.tsx.
// Có preview ảnh đã tải + nút xoá riêng, không chỉ mỗi toast xác nhận.
export function DocUploadRow({
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
  // "user": camera trước (selfie) — "environment": camera sau (chụp giấy tờ).
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

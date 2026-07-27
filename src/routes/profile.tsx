import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Award,
  Car,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Headphones,
  ImagePlus,
  KeyRound,
  Loader2,
  LogOut,
  MapPin,
  Pencil,
  Shield,
  Star,
  Wallet,
  X,
} from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "sonner";
import { refreshProfile, signOutAuth, useAuthState, useRequireRole } from "@/lib/auth";
import {
  type CustomerDocKind,
  type CustomerKycRow,
  getCustomerKyc,
  getCustomerStats,
  updateCustomerKyc,
  updateMyProfile,
  uploadAvatar,
  uploadCustomerDoc,
} from "@/lib/queries";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Tài khoản" }] }),
  component: Profile,
});

const ITEMS = [
  { label: "Điểm thưởng", Icon: Award, to: "/rewards" },
  { label: "Ví & thanh toán", Icon: Wallet, to: "/wallet" },
  { label: "Phương tiện của tôi", Icon: Car, to: "/vehicles" },
  { label: "Địa chỉ đã lưu", Icon: MapPin, to: "/addresses" },
  { label: "Phương thức thanh toán", Icon: CreditCard, to: "/wallet" },
  { label: "Đổi mật khẩu", Icon: KeyRound, to: "/change-password" },
  { label: "Trung tâm hỗ trợ", Icon: Headphones, to: "/support" },
  { label: "Điều khoản & bảo mật", Icon: Shield, to: "/terms" },
] as const;

function initialsOf(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(-2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "KH"
  );
}

function Profile() {
  useRequireRole("customer");
  const navigate = useNavigate();
  const authState = useAuthState();
  const userId = authState.session?.user.id;
  const fullName = authState.profile?.full_name ?? "Khách hàng";
  const phone = authState.profile?.phone ?? authState.session?.user.phone ?? "—";
  const [editing, setEditing] = useState(false);

  const { data: stats } = useQuery({
    queryKey: ["customer-stats", userId],
    queryFn: () => getCustomerStats(userId!),
    enabled: !!userId,
  });
  const { data: kyc } = useQuery({
    queryKey: ["customer-kyc", userId],
    queryFn: () => getCustomerKyc(userId!),
    enabled: !!userId,
  });

  const logout = async () => {
    await signOutAuth();
    toast("Đã đăng xuất");
    navigate({ to: "/login" });
  };

  return (
    <MobileShell>
      <div className="safe-top px-5 pt-3">
        <div className="rounded-3xl bg-surface p-5 shadow-elevated">
          <div className="flex items-center gap-3">
            {authState.profile?.avatar_url ? (
              <img
                src={authState.profile.avatar_url}
                alt={fullName}
                className="h-16 w-16 rounded-2xl object-cover shadow-glow"
              />
            ) : (
              <div className="grid h-16 w-16 place-items-center rounded-2xl gradient-primary text-xl font-black text-primary-foreground shadow-glow">
                {initialsOf(fullName)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-lg font-black">{fullName}</div>
              <div className="text-xs text-muted-foreground">{phone}</div>
              <div className="mt-1 flex items-center gap-1 text-xs">
                <Star className="h-3 w-3 fill-warning text-warning" />
                <span className="font-bold">{(stats?.rating ?? 5).toFixed(1)}</span>
                <span className="text-muted-foreground">· {stats?.tripsCount ?? 0} chuyến</span>
              </div>
            </div>
            <button
              onClick={() => setEditing(true)}
              aria-label="Chỉnh sửa hồ sơ"
              className="grid h-9 w-9 place-items-center rounded-full bg-background"
            >
              <Pencil className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-4 text-center">
            <Stat label="Chuyến" value={String(stats?.tripsCount ?? 0)} />
            <Link to="/rewards" className="rounded-xl transition active:bg-background/50">
              <div className="text-lg font-black text-primary">{stats?.points ?? 0}</div>
              <div className="text-[10px] uppercase text-muted-foreground">Điểm</div>
            </Link>
            <Stat label="Ưu đãi" value={String(stats?.promotionsUsed ?? 0)} />
          </div>
        </div>
      </div>

      <div className="mt-4 px-5">
        <div className="overflow-hidden rounded-3xl bg-surface">
          <ThemeToggle variant="row" className="border-b border-border/60" />
          {ITEMS.map(({ label, Icon, to }) => (
            <Link
              key={label}
              to={to}
              className="flex items-center gap-3 border-b border-border/60 p-4 last:border-b-0 active:bg-background/30"
            >
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-background text-primary">
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 text-sm font-semibold">{label}</div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-4 px-5">
        <Link
          to="/driver"
          className="flex items-center gap-3 rounded-3xl border border-primary/30 bg-primary/10 p-4"
        >
          <div className="grid h-11 w-11 place-items-center rounded-2xl gradient-primary text-xl">
            🚗
          </div>
          <div className="flex-1">
            <div className="text-sm font-bold">Trở thành tài xế</div>
            <div className="text-xs text-muted-foreground">
              Kiếm thêm thu nhập cùng Bạn Uống Mình Lái
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-primary" />
        </Link>
      </div>

      <div className="mt-4 px-5">
        <Link
          to="/admin"
          className="block rounded-2xl bg-surface p-3 text-center text-xs font-semibold text-muted-foreground"
        >
          Vào khu vực quản trị viên →
        </Link>
      </div>

      <div className="mt-4 px-5">
        <button
          onClick={logout}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border py-3 text-sm font-bold text-destructive"
        >
          <LogOut className="h-4 w-4" /> Đăng xuất
        </button>
      </div>
      <div className="mt-3 px-5 text-center text-[10px] text-muted-foreground">
        Phiên bản 0.1.0 · Cao Lãnh, Đồng Tháp
      </div>

      {editing && userId && (
        <EditProfileModal
          userId={userId}
          currentName={authState.profile?.full_name ?? ""}
          currentAvatar={authState.profile?.avatar_url ?? null}
          kyc={kyc ?? null}
          onClose={() => setEditing(false)}
        />
      )}
    </MobileShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-lg font-black text-primary">{value}</div>
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
    </div>
  );
}

// Sửa họ tên + ảnh đại diện — dùng chung logic upload/update với driver.profile.tsx.
function EditProfileModal({
  userId,
  currentName,
  currentAvatar,
  kyc,
  onClose,
}: {
  userId: string;
  currentName: string;
  currentAvatar: string | null;
  kyc: CustomerKycRow | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(currentName);
  const [idNumber, setIdNumber] = useState(kyc?.id_number ?? "");
  const [preview, setPreview] = useState<string | null>(currentAvatar);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const invalidateKyc = () => {
    queryClient.invalidateQueries({ queryKey: ["customer-kyc", userId] });
  };

  const pickFile = (file: File) => {
    setPendingFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const save = async () => {
    if (!name.trim()) {
      toast.error("Vui lòng nhập họ tên.");
      return;
    }
    setSaving(true);
    try {
      if (pendingFile) await uploadAvatar(userId, pendingFile);
      await updateMyProfile(userId, { full_name: name.trim() });
      await updateCustomerKyc(userId, idNumber.trim());
      await refreshProfile();
      queryClient.invalidateQueries({ queryKey: ["customer-stats", userId] });
      invalidateKyc();
      toast.success("Đã cập nhật hồ sơ");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không cập nhật được hồ sơ.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50" onClick={onClose}>
      <div
        className="safe-bottom w-full rounded-t-3xl bg-background p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="text-base font-black">Chỉnh sửa hồ sơ</div>
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
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) pickFile(file);
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="relative"
            aria-label="Đổi ảnh đại diện"
          >
            {preview ? (
              <img
                src={preview}
                alt="Ảnh đại diện"
                className="h-20 w-20 rounded-2xl object-cover shadow-glow"
              />
            ) : (
              <div className="grid h-20 w-20 place-items-center rounded-2xl gradient-primary text-xl font-black text-primary-foreground shadow-glow">
                {initialsOf(name || "KH")}
              </div>
            )}
            <span className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-foreground shadow-elevated">
              <Pencil className="h-3.5 w-3.5" />
            </span>
          </button>
        </div>

        <div className="mt-4">
          <div className="mb-1.5 text-xs font-semibold text-muted-foreground">Họ tên</div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nhập họ tên"
            className="w-full rounded-2xl bg-surface p-3.5 text-base outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        <div className="mt-4 text-xs font-bold uppercase text-muted-foreground">
          Xác thực danh tính (CCCD)
        </div>
        <div className="mt-3">
          <div className="mb-1.5 text-xs font-semibold text-muted-foreground">Số CCCD</div>
          <input
            value={idNumber}
            onChange={(e) => setIdNumber(e.target.value)}
            placeholder="079xxxxxxxxx"
            className="w-full rounded-2xl bg-surface p-3.5 text-base outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <DocUploadRow
          label="Mặt trước CCCD"
          userId={userId}
          kind="id_front"
          hasPhoto={!!kyc?.id_photo_url}
          onUploaded={invalidateKyc}
        />
        <DocUploadRow
          label="Mặt sau CCCD"
          userId={userId}
          kind="id_back"
          hasPhoto={!!kyc?.id_photo_back_url}
          onUploaded={invalidateKyc}
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

// Ảnh CCCD upload thẳng lên bucket private "customer-docs" khi chọn file
// (không đợi bấm "Lưu thay đổi") — cùng cách với DocUploadRow ở driver.profile.tsx.
function DocUploadRow({
  label,
  userId,
  kind,
  hasPhoto,
  onUploaded,
}: {
  label: string;
  userId: string;
  kind: CustomerDocKind;
  hasPhoto: boolean;
  onUploaded: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      await uploadCustomerDoc(userId, kind, file);
      toast.success(`Đã tải ${label.toLowerCase()}`);
      onUploaded();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không tải được ảnh.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="mt-3 flex items-center justify-between rounded-2xl bg-surface p-3.5">
      <div className="flex items-center gap-2 text-sm font-semibold">
        {hasPhoto && <CheckCircle2 className="h-4 w-4 text-success" />}
        {label}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-1.5 rounded-full bg-background px-3 py-1.5 text-xs font-bold disabled:opacity-60"
      >
        {uploading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <ImagePlus className="h-3.5 w-3.5" />
        )}
        {hasPhoto ? "Đổi ảnh" : "Tải ảnh"}
      </button>
    </div>
  );
}

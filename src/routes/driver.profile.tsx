import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, LogOut, Star } from "lucide-react";
import { toast } from "sonner";
import { DriverShell } from "@/components/DriverShell";
import { ThemeToggle } from "@/components/ThemeToggle";
import { signOutAuth, useAuthState, useRequireRole } from "@/lib/auth";
import { getDriverSelf } from "@/lib/queries";

export const Route = createFileRoute("/driver/profile")({
  head: () => ({ meta: [{ title: "Hồ sơ tài xế" }] }),
  component: DriverProfile,
});

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
  const fullName = authState.profile?.full_name ?? "Tài xế";
  const initials = fullName
    .split(" ")
    .slice(-2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const logout = async () => {
    await signOutAuth();
    toast("Đã đăng xuất khỏi tài khoản tài xế");
    navigate({ to: "/driver/login" });
  };

  const docs = [
    { label: "Ảnh chân dung", value: "Đã tải lên", verified: true },
    { label: "Họ tên", value: fullName, verified: true },
    { label: "Số điện thoại", value: authState.profile?.phone ?? "—", verified: true },
    { label: "Căn cước công dân", value: "079****1234", verified: true },
    { label: "Giấy phép lái xe", value: "Hạng B2 · HSD 03/2029", verified: true },
    { label: "Kinh nghiệm lái xe", value: "8 năm", verified: true },
    { label: "Người liên hệ khẩn cấp", value: "Trần Thị Hoa · 0987 654 321", verified: true },
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
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl gradient-primary text-2xl font-black text-primary-foreground shadow-glow">
          {initials || "TX"}
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
        onClick={logout}
        className="mx-5 mt-4 flex w-[calc(100%-2.5rem)] items-center justify-center gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 py-3.5 text-sm font-bold text-destructive"
      >
        <LogOut className="h-4 w-4" /> Đăng xuất
      </button>
    </DriverShell>
  );
}

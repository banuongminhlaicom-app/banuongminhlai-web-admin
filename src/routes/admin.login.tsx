import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, Lock, Mail } from "lucide-react";
import { toast } from "sonner";
import { BrandLogo } from "@/components/BrandLogo";
import { GoogleIcon } from "@/components/GoogleIcon";
import { signInAdmin, signInWithGoogle, signOutAuth, useAuthState } from "@/lib/auth";

export const Route = createFileRoute("/admin/login")({
  head: () => ({ meta: [{ title: "Đăng nhập quản trị" }] }),
  component: AdminLogin,
});

function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();
  const authState = useAuthState();
  const rejectedRef = useRef(false);
  const ok = email.trim().length > 3 && password.length >= 6;

  // Xử lý khi quay lại từ Google OAuth — chỉ vào được nếu profile đã có sẵn
  // role=admin (tài khoản admin luôn được cấp trước, không tự tạo mới ở đây).
  useEffect(() => {
    if (authState.status !== "signed_in" || !authState.profile || rejectedRef.current) return;
    if (authState.profile.role === "admin") {
      navigate({ to: "/admin" });
      return;
    }
    rejectedRef.current = true;
    toast.error("Tài khoản này không có quyền admin.");
    signOutAuth();
  }, [authState, navigate]);

  const submit = async () => {
    if (!ok || loading) return;
    setLoading(true);
    try {
      await signInAdmin(email.trim(), password);
      toast.success("Đăng nhập thành công");
      navigate({ to: "/admin" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Đăng nhập thất bại.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle("/admin/login");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không đăng nhập được với Google.");
      setGoogleLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col bg-background px-6 pb-10 pt-10 safe-top">
      <div className="flex flex-col items-center gap-3">
        <BrandLogo />
        <div className="text-center">
          <div className="text-lg font-black">Cổng quản trị</div>
          <div className="text-xs text-muted-foreground">Bạn Uống Mình Lái · Admin</div>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <button
          onClick={handleGoogle}
          disabled={googleLoading}
          className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-surface py-3.5 text-sm font-bold disabled:opacity-60"
        >
          {googleLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <GoogleIcon className="h-4 w-4" />
          )}
          Đăng nhập với Google
        </button>

        <div className="flex items-center gap-3 py-1 text-[11px] text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          hoặc dùng email
          <div className="h-px flex-1 bg-border" />
        </div>

        <label className="block">
          <span className="text-xs font-semibold text-muted-foreground">Email</span>
          <div className="mt-1 flex items-center gap-2 rounded-2xl bg-surface px-4 py-3">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              inputMode="email"
              autoComplete="username"
              className="w-full bg-transparent text-base font-semibold outline-none"
              placeholder="admin@example.com"
            />
          </div>
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-muted-foreground">Mật khẩu</span>
          <div className="mt-1 flex items-center gap-2 rounded-2xl bg-surface px-4 py-3">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              className="w-full bg-transparent text-base font-semibold outline-none"
              placeholder="••••••••"
            />
          </div>
        </label>

        <button
          onClick={submit}
          disabled={!ok || loading}
          className="flex w-full items-center justify-center gap-2 rounded-2xl gradient-primary py-3.5 text-sm font-bold text-primary-foreground shadow-glow disabled:opacity-40 disabled:shadow-none"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Đăng nhập
        </button>
      </div>

      <div className="mt-auto flex items-center justify-center gap-1 pt-8 text-[11px] text-muted-foreground">
        <CheckCircle2 className="h-3 w-3 text-success" />
        Chỉ dành cho quản trị viên đã được cấp tài khoản
      </div>
    </div>
  );
}

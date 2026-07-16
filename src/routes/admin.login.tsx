import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, Loader2, Lock, Mail } from "lucide-react";
import { toast } from "sonner";
import { BrandLogo } from "@/components/BrandLogo";
import { signInAdmin } from "@/lib/auth";

export const Route = createFileRoute("/admin/login")({
  head: () => ({ meta: [{ title: "Đăng nhập quản trị" }] }),
  component: AdminLogin,
});

function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const ok = email.trim().length > 3 && password.length >= 6;

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

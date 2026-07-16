import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Phone } from "lucide-react";
import { toast } from "sonner";
import { BrandLogo } from "@/components/BrandLogo";
import { GoogleIcon } from "@/components/GoogleIcon";
import { ensureProfile, sendPhoneOtp, signInWithGoogle, useAuthState } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  component: Login,
});

function toE164(localPhone: string) {
  const digits = localPhone.replace(/\D/g, "").replace(/^0+/, "");
  return `+84${digits}`;
}

function Login() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();
  const authState = useAuthState();
  const ok = phone.replace(/\D/g, "").length >= 9;

  // Xử lý khi quay lại từ Google OAuth (hoặc đã có sẵn phiên đăng nhập customer).
  useEffect(() => {
    if (authState.status !== "signed_in" || !authState.session) return;
    if (authState.profile) {
      if (authState.profile.role === "customer") navigate({ to: "/home" });
      return;
    }
    ensureProfile(authState.session.user.id, "customer", authState.session.user.phone || null)
      .then(() => navigate({ to: "/home" }))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Không tạo được hồ sơ."));
  }, [authState, navigate]);

  const submit = async () => {
    if (!ok || loading) return;
    setLoading(true);
    try {
      await sendPhoneOtp(toE164(phone));
      toast.success("Đã gửi mã OTP");
      navigate({ to: "/verify-otp", search: { phone } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không gửi được OTP. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không đăng nhập được với Google.");
      setGoogleLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background px-6 pb-10 pt-6 gradient-hero">
      <button
        onClick={() => history.back()}
        className="grid h-10 w-10 place-items-center rounded-full bg-surface"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>
      <div className="mt-8 flex flex-col items-center gap-3 text-center">
        <BrandLogo size="md" showText={false} />
        <h1 className="text-2xl font-black">Đăng nhập</h1>
        <p className="text-sm text-muted-foreground">Chọn cách đăng nhập bạn muốn dùng</p>
      </div>

      <div className="mt-8">
        <button
          onClick={handleGoogle}
          disabled={googleLoading}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-surface py-3.5 text-sm font-bold active:scale-[.98] transition disabled:opacity-60"
        >
          {googleLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <GoogleIcon className="h-4 w-4" />
          )}
          Đăng nhập với Google
        </button>

        <div className="my-4 flex items-center gap-3 text-[11px] text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          hoặc dùng số điện thoại
          <div className="h-px flex-1 bg-border" />
        </div>

        <label className="text-xs font-semibold uppercase text-muted-foreground">
          Số điện thoại
        </label>
        <div className="mt-2 flex items-center gap-2 rounded-2xl bg-surface p-4">
          <Phone className="h-5 w-5 text-muted-foreground" />
          <span className="text-base font-semibold">+84</span>
          <input
            inputMode="tel"
            placeholder="909 123 456"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="flex-1 bg-transparent text-base font-semibold outline-none placeholder:text-muted-foreground/60"
          />
        </div>
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
        Bằng việc tiếp tục, bạn đồng ý với{" "}
        <span className="text-foreground">Điều khoản sử dụng</span> và{" "}
        <span className="text-foreground">Chính sách bảo mật</span> của Bạn Uống Mình Lái.
      </p>

      <div className="mt-auto flex flex-col gap-3">
        <button
          disabled={!ok || loading}
          onClick={submit}
          className="flex items-center justify-center gap-2 rounded-2xl gradient-primary py-4 text-base font-bold text-primary-foreground shadow-glow disabled:opacity-40 disabled:shadow-none active:scale-[.98] transition"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Gửi mã OTP
        </button>
        <div className="text-center text-xs text-muted-foreground">
          Demo: dùng số điện thoại thử nghiệm đã cấu hình trong Supabase
        </div>
      </div>
    </div>
  );
}

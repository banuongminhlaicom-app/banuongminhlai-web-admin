import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Phone, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { BrandLogo } from "@/components/BrandLogo";
import { GoogleIcon } from "@/components/GoogleIcon";
import {
  ensureProfile,
  sendPhoneOtp,
  signInWithGoogle,
  signOutAuth,
  useAuthState,
  verifyPhoneOtp,
} from "@/lib/auth";

export const Route = createFileRoute("/driver/login")({
  head: () => ({ meta: [{ title: "Đăng nhập tài xế" }] }),
  component: DriverLogin,
});

function toE164(localPhone: string) {
  const digits = localPhone.replace(/\D/g, "").replace(/^0+/, "");
  return `+84${digits}`;
}

function DriverLogin() {
  const [phone, setPhone] = useState("0901234567");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();
  const authState = useAuthState();

  // Xử lý khi quay lại từ Google OAuth (hoặc đã có sẵn phiên đăng nhập driver).
  useEffect(() => {
    if (authState.status !== "signed_in" || !authState.session) return;
    if (authState.profile) {
      if (authState.profile.role === "driver") {
        navigate({ to: "/driver" });
      } else {
        toast.error(
          "Tài khoản Google này đã đăng ký với vai trò khác. Vui lòng dùng tài khoản khác cho tài xế.",
        );
        signOutAuth();
      }
      return;
    }
    ensureProfile(authState.session.user.id, "driver", authState.session.user.phone || null)
      .then(() => navigate({ to: "/driver" }))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Không tạo được hồ sơ."));
  }, [authState, navigate]);

  const sendOtp = async () => {
    if (phone.replace(/\D/g, "").length < 9) {
      toast.error("Số điện thoại không hợp lệ");
      return;
    }
    setSending(true);
    try {
      await sendPhoneOtp(toE164(phone));
      setOtpSent(true);
      toast.success("Đã gửi mã OTP");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không gửi được OTP. Vui lòng thử lại.");
    } finally {
      setSending(false);
    }
  };

  const submit = async () => {
    if (otp.length !== 6) {
      toast.error("Vui lòng nhập đủ 6 số OTP");
      return;
    }
    setLoading(true);
    try {
      await verifyPhoneOtp(toE164(phone), otp, "driver");
      toast.success("Đăng nhập thành công");
      navigate({ to: "/driver" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Mã OTP không đúng.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle("/driver/login");
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
          <div className="text-lg font-black">Cổng tài xế</div>
          <div className="text-xs text-muted-foreground">Bạn Uống Mình Lái · Cao Lãnh</div>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-2 rounded-2xl border border-success/40 bg-success/10 p-3">
        <ShieldCheck className="h-5 w-5 text-success" />
        <div className="text-xs">
          <div className="font-bold text-success">Hồ sơ đã được phê duyệt</div>
          <div className="text-muted-foreground">Trần Minh Tuấn · Bằng B2 · 328 chuyến</div>
        </div>
      </div>

      <div className="mt-6">
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
      </div>

      <div className="space-y-3">
        <label className="block">
          <span className="text-xs font-semibold text-muted-foreground">Số điện thoại</span>
          <div className="mt-1 flex items-center gap-2 rounded-2xl bg-surface px-4 py-3">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
              className="w-full bg-transparent text-base font-semibold outline-none"
              placeholder="09xx xxx xxx"
            />
          </div>
        </label>

        {otpSent && (
          <label className="block">
            <span className="text-xs font-semibold text-muted-foreground">Mã OTP</span>
            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              className="mt-1 w-full rounded-2xl bg-surface px-4 py-3 text-center text-2xl font-black tracking-[0.5em] outline-none"
              placeholder="••••••"
            />
          </label>
        )}

        {!otpSent ? (
          <button
            onClick={sendOtp}
            disabled={sending}
            className="flex w-full items-center justify-center gap-2 rounded-2xl gradient-primary py-3.5 text-sm font-bold text-primary-foreground shadow-glow disabled:opacity-60"
          >
            {sending && <Loader2 className="h-4 w-4 animate-spin" />}
            Gửi mã OTP
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl gradient-primary py-3.5 text-sm font-bold text-primary-foreground shadow-glow disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Đăng nhập tài xế
          </button>
        )}
      </div>

      <div className="mt-auto flex items-center justify-center gap-1 pt-8 text-[11px] text-muted-foreground">
        <CheckCircle2 className="h-3 w-3 text-success" />
        Kết nối an toàn · Chỉ dành cho tài xế đã đăng ký
      </div>
    </div>
  );
}

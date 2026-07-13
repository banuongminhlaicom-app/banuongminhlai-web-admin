import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Phone } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

export const Route = createFileRoute("/login")({
  component: Login,
});

function Login() {
  const [phone, setPhone] = useState("");
  const navigate = useNavigate();
  const ok = phone.replace(/\D/g, "").length >= 9;

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background px-6 pb-10 pt-6 gradient-hero">
      <button onClick={() => history.back()} className="grid h-10 w-10 place-items-center rounded-full bg-surface">
        <ArrowLeft className="h-5 w-5" />
      </button>
      <div className="mt-8 flex flex-col items-center gap-3 text-center">
        <BrandLogo size="md" showText={false} />
        <h1 className="text-2xl font-black">Đăng nhập</h1>
        <p className="text-sm text-muted-foreground">Nhập số điện thoại để nhận mã OTP</p>
      </div>

      <div className="mt-8">
        <label className="text-xs font-semibold uppercase text-muted-foreground">Số điện thoại</label>
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
        Bằng việc tiếp tục, bạn đồng ý với <span className="text-foreground">Điều khoản sử dụng</span> và{" "}
        <span className="text-foreground">Chính sách bảo mật</span> của Bạn Uống Mình Lái.
      </p>

      <div className="mt-auto flex flex-col gap-3">
        <button
          disabled={!ok}
          onClick={() => navigate({ to: "/verify-otp", search: { phone } })}
          className="rounded-2xl gradient-primary py-4 text-base font-bold text-primary-foreground shadow-glow disabled:opacity-40 disabled:shadow-none active:scale-[.98] transition"
        >
          Gửi mã OTP
        </button>
        <div className="text-center text-xs text-muted-foreground">Demo OTP: <span className="font-mono text-foreground">123456</span></div>
      </div>
    </div>
  );
}

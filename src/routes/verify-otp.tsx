import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/verify-otp")({
  validateSearch: (s: Record<string, unknown>) => ({ phone: (s.phone as string) ?? "" }),
  component: Verify,
});

function Verify() {
  const { phone } = Route.useSearch();
  const navigate = useNavigate();
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [seconds, setSeconds] = useState(60);
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  const setAt = (i: number, v: string) => {
    const c = v.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = c;
    setDigits(next);
    if (c && i < 5) refs.current[i + 1]?.focus();
    if (next.every((d) => d) && next.join("") === "123456") {
      toast.success("Đăng nhập thành công");
      setTimeout(() => navigate({ to: "/home" }), 400);
    } else if (next.every((d) => d)) {
      toast.error("Mã OTP không đúng. Demo: 123456");
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background px-6 pb-10 pt-6 gradient-hero">
      <button onClick={() => history.back()} className="grid h-10 w-10 place-items-center rounded-full bg-surface">
        <ArrowLeft className="h-5 w-5" />
      </button>
      <div className="mt-8">
        <h1 className="text-2xl font-black">Nhập mã OTP</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Mã đã được gửi đến <span className="font-semibold text-foreground">+84 {phone || "•••"}</span>
        </p>
      </div>

      <div className="mt-8 grid grid-cols-6 gap-2">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => { refs.current[i] = el; }}
            value={d}
            onChange={(e) => setAt(i, e.target.value)}
            onKeyDown={(e) => { if (e.key === "Backspace" && !d && i > 0) refs.current[i - 1]?.focus(); }}
            inputMode="numeric"
            maxLength={1}
            className="h-14 rounded-2xl bg-surface text-center text-2xl font-bold outline-none focus:ring-2 focus:ring-primary"
          />
        ))}
      </div>

      <div className="mt-6 text-center text-sm text-muted-foreground">
        {seconds > 0 ? (
          <>Gửi lại mã sau <span className="font-semibold text-foreground">{seconds}s</span></>
        ) : (
          <button onClick={() => setSeconds(60)} className="font-semibold text-primary">Gửi lại mã</button>
        )}
      </div>

      <div className="mt-auto rounded-2xl border border-border bg-surface p-4 text-center text-xs text-muted-foreground">
        Chế độ demo — nhập <span className="font-mono font-bold text-foreground">123456</span> để tiếp tục
      </div>
    </div>
  );
}

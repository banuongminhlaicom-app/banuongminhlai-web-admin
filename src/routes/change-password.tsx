import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Eye, EyeOff, Lock, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/change-password")({
  head: () => ({ meta: [{ title: "Đổi mật khẩu" }] }),
  component: ChangePassword,
});

function ChangePassword() {
  const navigate = useNavigate();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const strength = scoreStrength(next);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (current.length < 6) return toast.error("Mật khẩu hiện tại không đúng");
    if (next.length < 8) return toast.error("Mật khẩu mới cần ít nhất 8 ký tự");
    if (strength < 2) return toast.error("Mật khẩu quá yếu, hãy thêm chữ hoa/số/ký tự đặc biệt");
    if (next !== confirm) return toast.error("Xác nhận mật khẩu không khớp");
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success("Đã đổi mật khẩu thành công");
      navigate({ to: "/profile" });
    }, 900);
  }

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background pb-24">
      <div className="safe-top flex items-center gap-3 px-5 py-3">
        <button onClick={() => history.back()} className="grid h-10 w-10 place-items-center rounded-full bg-surface">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-black">Đổi mật khẩu</h1>
      </div>

      <div className="mx-5 flex items-start gap-3 rounded-2xl bg-surface p-4">
        <div className="grid h-10 w-10 place-items-center rounded-xl gradient-primary text-primary-foreground shadow-glow">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div className="text-xs text-muted-foreground">
          Vì an toàn tài khoản, đừng chia sẻ mật khẩu và nên dùng mật khẩu khác với các dịch vụ khác.
        </div>
      </div>

      <form onSubmit={submit} className="mx-5 mt-4 space-y-3">
        <Field label="Mật khẩu hiện tại" value={current} onChange={setCurrent} show={show} />
        <Field label="Mật khẩu mới" value={next} onChange={setNext} show={show} />
        <Field label="Xác nhận mật khẩu mới" value={confirm} onChange={setConfirm} show={show} />

        <button type="button" onClick={() => setShow((s) => !s)} className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
        </button>

        {next && (
          <div className="rounded-2xl bg-surface p-3">
            <div className="mb-1.5 flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">Độ mạnh</span>
              <span className={`font-bold ${strength >= 3 ? "text-success" : strength === 2 ? "text-warning" : "text-destructive"}`}>
                {STRENGTH_LABEL[strength]}
              </span>
            </div>
            <div className="flex gap-1">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className={`h-1.5 flex-1 rounded-full ${i < strength ? (strength >= 3 ? "bg-success" : strength === 2 ? "bg-warning" : "bg-destructive") : "bg-background"}`} />
              ))}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl gradient-primary py-3.5 text-sm font-black text-primary-foreground shadow-glow disabled:opacity-60"
        >
          <Lock className="h-4 w-4" />
          {loading ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, show }: { label: string; value: string; onChange: (v: string) => void; show: boolean }) {
  return (
    <label className="block">
      <div className="mb-1.5 text-xs font-semibold text-muted-foreground">{label}</div>
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl bg-surface px-4 py-3 text-sm font-semibold outline-none ring-1 ring-transparent focus:ring-primary"
        placeholder="••••••••"
      />
    </label>
  );
}

const STRENGTH_LABEL = ["Rất yếu", "Yếu", "Trung bình", "Mạnh", "Rất mạnh"] as const;
function scoreStrength(v: string) {
  let s = 0;
  if (v.length >= 8) s++;
  if (/[A-Z]/.test(v) && /[a-z]/.test(v)) s++;
  if (/\d/.test(v)) s++;
  if (/[^A-Za-z0-9]/.test(v)) s++;
  return Math.min(s, 4);
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Calendar, Clock } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { toast } from "sonner";

export const Route = createFileRoute("/schedule")({
  head: () => ({ meta: [{ title: "Đặt lịch trước" }] }),
  component: Schedule,
});

function Schedule() {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("22:00");
  const [note, setNote] = useState("");
  return (
    <MobileShell>
      <div className="safe-top px-5 pt-3">
        <h1 className="text-2xl font-black">Đặt lịch trước</h1>
        <p className="mt-1 text-sm text-muted-foreground">Sắp xếp trước cho những cuộc vui đã lên kế hoạch</p>
      </div>

      <div className="mt-5 space-y-3 px-5">
        <Field label="Điểm đón" placeholder="Nhập địa chỉ đón" />
        <Field label="Điểm đến" placeholder="Nhập điểm đến" />

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-surface p-3">
            <label className="flex items-center gap-1.5 text-[10px] uppercase text-muted-foreground"><Calendar className="h-3 w-3" /> Ngày</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full bg-transparent text-sm font-semibold outline-none [color-scheme:dark]" />
          </div>
          <div className="rounded-2xl bg-surface p-3">
            <label className="flex items-center gap-1.5 text-[10px] uppercase text-muted-foreground"><Clock className="h-3 w-3" /> Giờ</label>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="mt-1 w-full bg-transparent text-sm font-semibold outline-none [color-scheme:dark]" />
          </div>
        </div>

        <div className="rounded-2xl bg-surface p-3">
          <label className="text-[10px] uppercase text-muted-foreground">Ghi chú cho tài xế</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className="mt-1 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" placeholder="Ví dụ: Xe Vios đen, số tự động, đậu sau nhà hàng" />
        </div>

        <div className="rounded-3xl border border-primary/30 bg-primary/10 p-4 text-xs text-muted-foreground">
          Chúng tôi sẽ tự động tìm tài xế trước giờ hẹn 30 phút và thông báo tới bạn.
        </div>

        <button
          onClick={() => toast.success("Đã lên lịch chuyến đi", { description: `Vào lúc ${time || "22:00"} ${date || "hôm nay"}` })}
          className="w-full rounded-2xl gradient-primary py-4 text-base font-bold text-primary-foreground shadow-glow active:scale-[.98] transition"
        >
          XÁC NHẬN ĐẶT LỊCH
        </button>
        <Link to="/booking" className="block text-center text-sm text-muted-foreground">Đặt tài xế ngay thay thế</Link>
      </div>
    </MobileShell>
  );
}

function Field({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <div className="rounded-2xl bg-surface p-3">
      <label className="text-[10px] uppercase text-muted-foreground">{label}</label>
      <input placeholder={placeholder} className="mt-1 w-full bg-transparent text-sm font-semibold outline-none placeholder:text-muted-foreground" />
    </div>
  );
}

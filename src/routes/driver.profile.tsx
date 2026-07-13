import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/driver/profile")({
  head: () => ({ meta: [{ title: "Hồ sơ tài xế" }] }),
  component: DriverProfile,
});

const DOCS = [
  { label: "Ảnh chân dung", value: "Đã tải lên", verified: true },
  { label: "Căn cước công dân", value: "079****1234", verified: true },
  { label: "Giấy phép lái xe", value: "Hạng B2 · HSD 03/2029", verified: true },
  { label: "Kinh nghiệm lái xe", value: "8 năm", verified: true },
  { label: "Người liên hệ khẩn cấp", value: "Trần Thị Hoa · 0987 654 321", verified: true },
];

function DriverProfile() {
  return (
    <div className="mx-auto min-h-screen max-w-md bg-background pb-10">
      <div className="safe-top flex items-center gap-3 px-5 py-3">
        <button onClick={() => history.back()} className="grid h-10 w-10 place-items-center rounded-full bg-surface"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="text-lg font-black">Hồ sơ tài xế</h1>
      </div>

      <div className="mx-5 rounded-3xl bg-surface p-5 text-center shadow-elevated">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl gradient-primary text-2xl font-black text-primary-foreground shadow-glow">TT</div>
        <div className="mt-3 text-lg font-black">Trần Minh Tuấn</div>
        <div className="text-xs text-muted-foreground">Tài xế · Cao Lãnh, Đồng Tháp</div>
        <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-success/20 px-3 py-1 text-xs font-bold text-success">
          <CheckCircle2 className="h-3 w-3" /> Đã xét duyệt
        </div>
      </div>

      <div className="mx-5 mt-4 divide-y divide-border/60 overflow-hidden rounded-2xl bg-surface">
        {DOCS.map((d) => (
          <div key={d.label} className="flex items-center justify-between p-4">
            <div>
              <div className="text-xs text-muted-foreground">{d.label}</div>
              <div className="mt-0.5 text-sm font-bold">{d.value}</div>
            </div>
            {d.verified && <CheckCircle2 className="h-5 w-5 text-success" />}
          </div>
        ))}
      </div>
    </div>
  );
}

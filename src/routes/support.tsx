import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Phone, MessageSquare, AlertTriangle, HelpCircle } from "lucide-react";

export const Route = createFileRoute("/support")({
  head: () => ({ meta: [{ title: "Trung tâm hỗ trợ" }] }),
  component: Support,
});

const FAQ = [
  "Làm sao để đặt tài xế?",
  "Phí dịch vụ tính như thế nào?",
  "Tôi có thể hủy chuyến không?",
  "Chính sách bảo hiểm phương tiện?",
  "Làm sao báo mất đồ trên xe?",
];

function Support() {
  return (
    <div className="mx-auto min-h-screen max-w-md bg-background pb-10">
      <div className="safe-top flex items-center gap-3 px-5 py-3">
        <button onClick={() => history.back()} className="grid h-10 w-10 place-items-center rounded-full bg-surface"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="text-lg font-black">Trung tâm hỗ trợ</h1>
      </div>

      <div className="grid grid-cols-2 gap-2 px-5">
        <ActionCard Icon={Phone} label="Tổng đài" desc="1900 6868" tone="primary" />
        <ActionCard Icon={MessageSquare} label="Chat" desc="Trực tuyến 24/7" />
        <ActionCard Icon={AlertTriangle} label="Báo sự cố" desc="Chuyến đi vừa qua" />
        <ActionCard Icon={HelpCircle} label="Báo mất đồ" desc="Trên phương tiện" />
      </div>

      <h3 className="mb-2 mt-6 px-5 text-sm font-bold">Câu hỏi thường gặp</h3>
      <div className="mx-5 divide-y divide-border/60 overflow-hidden rounded-2xl bg-surface">
        {FAQ.map((q) => (
          <button key={q} className="flex w-full items-center justify-between p-4 text-left text-sm font-semibold active:bg-background/30">
            {q}
            <span className="text-muted-foreground">›</span>
          </button>
        ))}
      </div>

      <div className="mt-4 px-5 text-center text-xs text-muted-foreground">
        <Link to="/terms" className="underline">Điều khoản sử dụng</Link> · <Link to="/privacy" className="underline">Chính sách bảo mật</Link>
      </div>
    </div>
  );
}

function ActionCard({ Icon, label, desc, tone }: { Icon: typeof Phone; label: string; desc: string; tone?: "primary" }) {
  return (
    <button className={`rounded-2xl p-4 text-left ${tone === "primary" ? "gradient-primary text-primary-foreground shadow-glow" : "bg-surface"}`}>
      <Icon className="h-6 w-6" />
      <div className="mt-2 text-sm font-bold">{label}</div>
      <div className={`text-xs ${tone === "primary" ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{desc}</div>
    </button>
  );
}

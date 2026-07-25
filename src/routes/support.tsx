import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  Phone,
  MessageSquare,
  AlertTriangle,
  HelpCircle,
  Loader2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthState } from "@/lib/auth";
import { createSupportTicket } from "@/lib/queries";

export const Route = createFileRoute("/support")({
  head: () => ({ meta: [{ title: "Trung tâm hỗ trợ" }] }),
  component: Support,
});

const HOTLINE = "19006868";

const FAQ = [
  "Làm sao để đặt tài xế?",
  "Phí dịch vụ tính như thế nào?",
  "Tôi có thể hủy chuyến không?",
  "Chính sách bảo hiểm phương tiện?",
  "Làm sao báo mất đồ trên xe?",
];

function Support() {
  const authState = useAuthState();
  const userId = authState.session?.user.id;
  const [ticketSubject, setTicketSubject] = useState<string | null>(null);

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background pb-10">
      <div className="safe-top flex items-center gap-3 px-5 py-3">
        <button
          onClick={() => history.back()}
          className="grid h-10 w-10 place-items-center rounded-full bg-surface"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-black">Trung tâm hỗ trợ</h1>
      </div>

      <div className="grid grid-cols-2 gap-2 px-5">
        <a href={`tel:${HOTLINE}`}>
          <ActionCard Icon={Phone} label="Tổng đài" desc="1900 6868" tone="primary" />
        </a>
        <ActionCard
          Icon={MessageSquare}
          label="Chat"
          desc="Gửi yêu cầu hỗ trợ"
          onClick={() => setTicketSubject("Chat hỗ trợ trực tuyến")}
        />
        <ActionCard
          Icon={AlertTriangle}
          label="Báo sự cố"
          desc="Chuyến đi vừa qua"
          onClick={() => setTicketSubject("Báo sự cố chuyến đi")}
        />
        <ActionCard
          Icon={HelpCircle}
          label="Báo mất đồ"
          desc="Trên phương tiện"
          onClick={() => setTicketSubject("Báo mất đồ trên phương tiện")}
        />
      </div>

      <h3 className="mb-2 mt-6 px-5 text-sm font-bold">Câu hỏi thường gặp</h3>
      <div className="mx-5 divide-y divide-border/60 overflow-hidden rounded-2xl bg-surface">
        {FAQ.map((q) => (
          <button
            key={q}
            className="flex w-full items-center justify-between p-4 text-left text-sm font-semibold active:bg-background/30"
          >
            {q}
            <span className="text-muted-foreground">›</span>
          </button>
        ))}
      </div>

      <div className="mt-4 px-5 text-center text-xs text-muted-foreground">
        <Link to="/terms" className="underline">
          Điều khoản sử dụng
        </Link>{" "}
        ·{" "}
        <Link to="/privacy" className="underline">
          Chính sách bảo mật
        </Link>
      </div>

      {ticketSubject && (
        <TicketModal
          subject={ticketSubject}
          userId={userId}
          onClose={() => setTicketSubject(null)}
        />
      )}
    </div>
  );
}

// Form gửi yêu cầu hỗ trợ — dùng chung cho cả 3 nút (Chat, Báo sự cố, Báo mất
// đồ), chỉ khác tiêu đề mặc định. Gửi xong tạo 1 ticket thật trong Supabase,
// admin.support.tsx sẽ thấy và xử lý.
function TicketModal({
  subject,
  userId,
  onClose,
}: {
  subject: string;
  userId: string | undefined;
  onClose: () => void;
}) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (!userId) {
      toast.error("Bạn cần đăng nhập để gửi yêu cầu hỗ trợ.");
      return;
    }
    if (!message.trim()) {
      toast.error("Vui lòng mô tả nội dung cần hỗ trợ.");
      return;
    }
    setSending(true);
    try {
      await createSupportTicket(userId, subject, message);
      toast.success("Đã gửi yêu cầu hỗ trợ, chúng tôi sẽ phản hồi sớm.");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không gửi được yêu cầu.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50" onClick={onClose}>
      <div
        className="safe-bottom w-full rounded-t-3xl bg-background p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="text-base font-black">{subject}</div>
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="grid h-8 w-8 place-items-center rounded-full bg-surface"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          autoFocus
          placeholder="Mô tả chi tiết vấn đề của bạn..."
          className="w-full resize-none rounded-2xl bg-surface p-3.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
        />
        <button
          onClick={submit}
          disabled={sending}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl gradient-primary py-3.5 text-sm font-bold text-primary-foreground shadow-glow disabled:opacity-60"
        >
          {sending && <Loader2 className="h-4 w-4 animate-spin" />}
          Gửi yêu cầu
        </button>
      </div>
    </div>
  );
}

function ActionCard({
  Icon,
  label,
  desc,
  tone,
  onClick,
}: {
  Icon: typeof Phone;
  label: string;
  desc: string;
  tone?: "primary";
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-2xl p-4 text-left ${tone === "primary" ? "gradient-primary text-primary-foreground shadow-glow" : "bg-surface"}`}
    >
      <Icon className="h-6 w-6" />
      <div className="mt-2 text-sm font-bold">{label}</div>
      <div
        className={`text-xs ${tone === "primary" ? "text-primary-foreground/80" : "text-muted-foreground"}`}
      >
        {desc}
      </div>
    </button>
  );
}

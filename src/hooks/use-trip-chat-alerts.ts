import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { subscribeTripMessages } from "@/lib/queries";

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

// Phát 1 tiếng "ting" ngắn bằng Web Audio API — khỏi cần thêm file âm thanh
// vào repo. Trình duyệt có thể chặn audio nếu trang chưa có tương tác nào từ
// người dùng; bỏ qua lỗi đó, toast + badge vẫn hiển thị bình thường.
function playNotifySound() {
  try {
    const Ctx = window.AudioContext ?? window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1175, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.32);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.34);
    osc.onended = () => ctx.close();
  } catch {
    // Trình duyệt chặn/không hỗ trợ Web Audio — bỏ qua, không chặn luồng chính.
  }
}

// Theo dõi tin nhắn mới trong chuyến ở NGOÀI khung chat (TripChat) — để tài
// xế/khách không bỏ lỡ tin nhắn dù đang xem bản đồ hay màn khác, không phải
// lúc nào cũng mở sẵn khung chat. Khi khung chat đang mở thì TripChat tự lo
// phần hiển thị realtime rồi nên hook này tạm ngừng subscribe (tránh mở 2
// channel Supabase trùng tên cùng lúc) và luôn giữ unreadCount = 0.
export function useTripChatAlerts({
  tripId,
  selfId,
  peerName,
  chatOpen,
}: {
  tripId: string | null | undefined;
  selfId: string | null | undefined;
  peerName: string;
  chatOpen: boolean;
}) {
  const [unreadCount, setUnreadCount] = useState(0);
  const peerNameRef = useRef(peerName);
  peerNameRef.current = peerName;

  useEffect(() => {
    if (chatOpen) setUnreadCount(0);
  }, [chatOpen]);

  useEffect(() => {
    if (!tripId || !selfId || chatOpen) return;
    return subscribeTripMessages(tripId, (row) => {
      if (row.sender_id === selfId) return; // tin của chính mình gửi, khỏi báo
      setUnreadCount((n) => n + 1);
      playNotifySound();
      toast(`💬 ${peerNameRef.current}`, { description: row.content });
    });
  }, [tripId, selfId, chatOpen]);

  return { unreadCount };
}

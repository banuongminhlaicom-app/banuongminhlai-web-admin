import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Send, X } from "lucide-react";
import { toast } from "sonner";
import {
  getTripMessages,
  sendTripMessage,
  subscribeTripMessages,
  type TripMessageRow,
} from "@/lib/queries";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

// Khung chat trong chuyến, dùng chung cho cả màn khách và màn tài xế. Tin nhắn
// realtime qua Supabase (subscribeTripMessages) + polling 8s dự phòng nếu
// WebSocket lỡ sự kiện. `selfId` để phân biệt bong bóng của mình vs của đối phương.
export function TripChat({
  tripId,
  selfId,
  peerName,
  onClose,
}: {
  tripId: string;
  selfId: string;
  peerName: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const { data: messages } = useQuery({
    queryKey: ["trip-messages", tripId],
    queryFn: () => getTripMessages(tripId),
    refetchInterval: 8000,
  });

  useEffect(() => {
    return subscribeTripMessages(tripId, (row) => {
      queryClient.setQueryData<TripMessageRow[]>(["trip-messages", tripId], (prev) => {
        const list = prev ?? [];
        // Realtime cũng bắn về cho chính người gửi -> chống trùng theo id.
        if (list.some((m) => m.id === row.id)) return list;
        return [...list, row];
      });
    });
  }, [tripId, queryClient]);

  // Cuộn xuống cuối mỗi khi có tin mới hoặc mở khung.
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      await sendTripMessage(tripId, selfId, text);
      setDraft("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không gửi được tin nhắn.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50" onClick={onClose}>
      <div
        className="safe-bottom flex h-[80vh] w-full max-w-md flex-col self-center rounded-t-3xl bg-background"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-black">{peerName}</div>
            <div className="text-[11px] text-muted-foreground">Tin nhắn trong chuyến</div>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
          {(messages ?? []).length === 0 ? (
            <div className="mt-8 text-center text-xs text-muted-foreground">
              Chưa có tin nhắn. Hãy gửi lời chào 👋
            </div>
          ) : (
            (messages ?? []).map((m) => {
              const mine = m.sender_id === selfId;
              return (
                <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                  <div className="max-w-[78%]">
                    <div
                      className={cn(
                        "rounded-2xl px-3 py-2 text-sm",
                        mine
                          ? "gradient-primary text-primary-foreground"
                          : "bg-surface text-foreground",
                      )}
                    >
                      {m.content}
                    </div>
                    <div
                      className={cn(
                        "mt-0.5 text-[10px] text-muted-foreground",
                        mine ? "text-right" : "text-left",
                      )}
                    >
                      {formatRelativeTime(m.created_at)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-border px-3 py-3">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
            }}
            placeholder="Nhập tin nhắn…"
            className="h-11 flex-1 rounded-full border border-border bg-surface px-4 text-sm outline-none focus:border-primary"
          />
          <button
            onClick={send}
            disabled={sending || !draft.trim()}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full gradient-primary text-primary-foreground shadow-glow disabled:opacity-50"
            aria-label="Gửi"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

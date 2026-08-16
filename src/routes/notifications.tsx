import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Bell, BellOff, BellRing, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { MOCK_NOTIFICATIONS } from "@/lib/mock";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAuthState, useRequireRole } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase";
import { getNotifications, markNotificationRead, subscribeNotifications } from "@/lib/queries";
import {
  getExistingPushSubscription,
  isPushConfigured,
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/push";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Thông báo" }] }),
  component: Notifications,
});

function PushToggle({ userId }: { userId: string | undefined }) {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!isPushSupported()) {
      setChecked(true);
      return;
    }
    getExistingPushSubscription()
      .then((sub) => setEnabled(!!sub))
      .finally(() => setChecked(true));
  }, []);

  if (!isPushConfigured() || !isPushSupported() || !checked) return null;

  const toggle = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      if (enabled) {
        await unsubscribeFromPush();
        setEnabled(false);
        toast.success("Đã tắt thông báo đẩy trên thiết bị này.");
      } else {
        await subscribeToPush(userId);
        setEnabled(true);
        toast.success("Đã bật thông báo đẩy — bạn sẽ nhận được kể cả khi tắt tab.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không bật được thông báo đẩy.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={loading || !userId}
      className="mx-5 mb-4 flex w-[calc(100%-2.5rem)] items-center gap-3 rounded-2xl bg-surface p-4 text-left disabled:opacity-60"
    >
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-background text-primary">
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : enabled ? (
          <BellRing className="h-4 w-4" />
        ) : (
          <BellOff className="h-4 w-4" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold">
          {enabled ? "Thông báo đẩy: Đang bật" : "Bật thông báo đẩy"}
        </div>
        <div className="text-xs text-muted-foreground">
          {enabled
            ? "Nhận thông báo kể cả khi đã tắt tab trình duyệt."
            : "Không bỏ lỡ chuyến mới hoặc tin nhắn khi không mở sẵn app."}
        </div>
      </div>
    </button>
  );
}

function Notifications() {
  useRequireRole(["customer", "driver"]);
  const { session } = useAuthState();
  const navigate = useNavigate();
  const userId = session?.user.id;
  const useMock = !isSupabaseConfigured;
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", userId],
    queryFn: () => getNotifications(userId!),
    enabled: !useMock && !!userId,
  });

  useEffect(() => {
    if (useMock || !userId) return;
    return subscribeNotifications(userId, () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
    });
  }, [useMock, userId, queryClient]);

  const items = useMock
    ? MOCK_NOTIFICATIONS.map((n) => ({
        id: n.id,
        title: n.title,
        content: n.content,
        time: n.time,
        read: !!n.read,
        url: null as string | null,
      }))
    : notifications.map((n) => ({
        id: n.id,
        title: n.title,
        content: n.content,
        time: formatRelativeTime(n.created_at),
        read: n.read,
        url: n.url,
      }));

  const handleClick = (id: string, read: boolean, url: string | null) => {
    if (!useMock && !read) {
      markNotificationRead(id).then(() =>
        queryClient.invalidateQueries({ queryKey: ["notifications", userId] }),
      );
    }
    if (url) navigate({ to: url });
  };

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background pb-10">
      <div className="safe-top flex items-center gap-3 px-5 py-3">
        <button
          onClick={() => window.history.back()}
          className="grid h-10 w-10 place-items-center rounded-full bg-surface"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-black">Thông báo</h1>
      </div>
      <PushToggle userId={userId} />
      <div className="space-y-2 px-5">
        {items.length === 0 ? (
          <div className="rounded-2xl bg-surface p-6 text-center text-sm text-muted-foreground">
            Bạn chưa có thông báo nào.
          </div>
        ) : (
          items.map((n) => (
            <button
              key={n.id}
              onClick={() => handleClick(n.id, n.read, n.url)}
              className={cn(
                "flex w-full gap-3 rounded-2xl p-4 text-left",
                n.read ? "bg-surface/60" : "bg-surface",
              )}
            >
              <div
                className={cn(
                  "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
                  n.read
                    ? "bg-background text-muted-foreground"
                    : "gradient-primary text-primary-foreground shadow-glow",
                )}
              >
                <Bell className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="truncate text-sm font-bold">{n.title}</div>
                  {!n.read && <div className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">{n.content}</div>
                <div className="mt-1 text-[10px] text-muted-foreground">{n.time}</div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

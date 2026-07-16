import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Bell } from "lucide-react";
import { MOCK_NOTIFICATIONS } from "@/lib/mock";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAuthState, useRequireRole } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase";
import { getNotifications, markNotificationRead, subscribeNotifications } from "@/lib/queries";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Thông báo" }] }),
  component: Notifications,
});

function Notifications() {
  useRequireRole("customer");
  const { session } = useAuthState();
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
      }))
    : notifications.map((n) => ({
        id: n.id,
        title: n.title,
        content: n.content,
        time: formatRelativeTime(n.created_at),
        read: n.read,
      }));

  const handleClick = (id: string, read: boolean) => {
    if (useMock || read) return;
    markNotificationRead(id).then(() =>
      queryClient.invalidateQueries({ queryKey: ["notifications", userId] }),
    );
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
      <div className="space-y-2 px-5">
        {items.length === 0 ? (
          <div className="rounded-2xl bg-surface p-6 text-center text-sm text-muted-foreground">
            Bạn chưa có thông báo nào.
          </div>
        ) : (
          items.map((n) => (
            <button
              key={n.id}
              onClick={() => handleClick(n.id, n.read)}
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

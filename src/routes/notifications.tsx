import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Bell } from "lucide-react";
import { MOCK_NOTIFICATIONS } from "@/lib/mock";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Thông báo" }] }),
  component: Notifications,
});

function Notifications() {
  return (
    <div className="mx-auto min-h-screen max-w-md bg-background pb-10">
      <div className="safe-top flex items-center gap-3 px-5 py-3">
        <button onClick={() => history.back()} className="grid h-10 w-10 place-items-center rounded-full bg-surface"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="text-lg font-black">Thông báo</h1>
      </div>
      <div className="space-y-2 px-5">
        {MOCK_NOTIFICATIONS.map((n) => (
          <div key={n.id} className={cn("flex gap-3 rounded-2xl p-4", n.read ? "bg-surface/60" : "bg-surface")}>
            <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", n.read ? "bg-background text-muted-foreground" : "gradient-primary text-primary-foreground shadow-glow")}>
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
          </div>
        ))}
      </div>
    </div>
  );
}

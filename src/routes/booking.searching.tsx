import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { X } from "lucide-react";
import { MapPreview } from "@/components/MapPreview";
import { BrandLogo } from "@/components/BrandLogo";

export const Route = createFileRoute("/booking/searching")({
  component: Searching,
});

function Searching() {
  const navigate = useNavigate();
  useEffect(() => {
    const t = setTimeout(() => navigate({ to: "/booking/$id", params: { id: "8821" } }), 3500);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div className="relative mx-auto min-h-screen max-w-md bg-background">
      <MapPreview className="absolute inset-0 h-full w-full" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-transparent to-background" />

      <div className="safe-top absolute inset-x-0 top-0 flex items-center justify-between px-5 py-3">
        <BrandLogo size="sm" showText={false} />
        <button onClick={() => history.back()} className="grid h-10 w-10 place-items-center rounded-full bg-surface/90">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="relative grid h-32 w-32 place-items-center">
          <div className="absolute inset-0 animate-ping rounded-full bg-primary/40" />
          <div className="absolute inset-4 animate-ping rounded-full bg-primary/60 [animation-delay:200ms]" />
          <div className="relative grid h-16 w-16 place-items-center rounded-full gradient-primary shadow-glow text-2xl">
            🚗
          </div>
        </div>
      </div>

      <div className="absolute inset-x-4 bottom-6 rounded-3xl bg-surface/95 p-5 backdrop-blur-xl shadow-elevated safe-bottom">
        <div className="text-center">
          <div className="text-lg font-black">Đang tìm tài xế gần bạn…</div>
          <p className="mt-1 text-sm text-muted-foreground">Chúng tôi đang kết nối với các tài xế trong bán kính 3km</p>
        </div>
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-background">
            <div className="h-full w-2/3 animate-pulse gradient-primary" />
          </div>
        </div>
        <button onClick={() => history.back()} className="mt-4 w-full rounded-2xl border border-border py-3 text-sm font-bold">
          Hủy yêu cầu
        </button>
      </div>
    </div>
  );
}

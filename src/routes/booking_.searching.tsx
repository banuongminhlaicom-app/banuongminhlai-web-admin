import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { MapPreview } from "@/components/MapPreview";
import { BrandLogo } from "@/components/BrandLogo";
import { useRequireRole } from "@/lib/auth";
import { cancelTrip, getTrip, subscribeTripStatus } from "@/lib/queries";

export const Route = createFileRoute("/booking_/searching")({
  validateSearch: (s: Record<string, unknown>) => ({ tripId: (s.tripId as string) ?? "" }),
  component: Searching,
});

const NO_DRIVER_TIMEOUT_MS = 45000;
// Realtime đôi lúc lỡ sự kiện (mất kết nối, subscribe trễ hơn thời điểm tài xế
// nhận chuyến...) nên vẫn cần dò lại định kỳ để đảm bảo màn hình luôn cập nhật
// đúng trong vài giây, không phụ thuộc hoàn toàn vào Realtime.
const POLL_INTERVAL_MS = 3000;

function Searching() {
  useRequireRole("customer");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { tripId } = Route.useSearch();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!tripId) navigate({ to: "/booking" });
  }, [tripId, navigate]);

  const { data: trip } = useQuery({
    queryKey: ["trip", tripId],
    queryFn: () => getTrip(tripId),
    enabled: !!tripId,
    refetchInterval: POLL_INTERVAL_MS,
  });

  useEffect(() => {
    if (!tripId) return;
    return subscribeTripStatus(tripId, (updated) => {
      queryClient.setQueryData(["trip", tripId], updated);
    });
  }, [tripId, queryClient]);

  useEffect(() => {
    if (!trip) return;
    // Điều hướng cứng: navigate() của router đôi lúc không hoàn tất việc
    // render route mới dù URL đã đổi. window.location đảm bảo luôn vào đúng
    // màn hình bằng cách tải lại trang thật từ server.
    if (trip.status === "cancelled") {
      window.location.href = "/home";
    } else if (trip.status !== "searching") {
      window.location.href = `/booking/${tripId}`;
    }
  }, [trip, tripId]);

  useEffect(() => {
    if (!tripId) return;
    const timer = window.setTimeout(() => setTimedOut(true), NO_DRIVER_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [tripId]);

  const cancel = async () => {
    if (tripId) {
      try {
        await cancelTrip(tripId);
      } catch {
        /* chuyến có thể đã đổi trạng thái, bỏ qua lỗi khi thoát */
      }
    }
    history.back();
  };

  return (
    <div className="relative mx-auto min-h-screen max-w-md bg-background">
      <MapPreview className="absolute inset-0 h-full w-full" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-transparent to-background" />

      <div className="safe-top absolute inset-x-0 top-0 flex items-center justify-between px-5 py-3">
        <BrandLogo size="sm" showText={false} />
        <button
          onClick={cancel}
          className="grid h-10 w-10 place-items-center rounded-full bg-surface/90"
        >
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
        {timedOut ? (
          <div className="text-center">
            <div className="text-lg font-black">Chưa tìm thấy tài xế phù hợp</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Hiện chưa có tài xế nào online gần bạn. Bạn có thể chờ thêm hoặc huỷ yêu cầu.
            </p>
          </div>
        ) : (
          <div className="text-center">
            <div className="text-lg font-black">Đang tìm tài xế gần bạn…</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Chúng tôi đang kết nối với các tài xế trong bán kính 3km
            </p>
          </div>
        )}
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-background">
            <div className="h-full w-2/3 animate-pulse gradient-primary" />
          </div>
        </div>
        <button
          onClick={cancel}
          className="mt-4 w-full rounded-2xl border border-border py-3 text-sm font-bold"
        >
          Hủy yêu cầu
        </button>
      </div>
    </div>
  );
}

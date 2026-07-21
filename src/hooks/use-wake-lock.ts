import { useEffect, useRef } from "react";

// Giữ màn hình luôn sáng khi tài xế đang dẫn đường — nếu màn hình tự tắt, hệ
// điều hành sẽ tạm ngưng luôn watchPosition (GPS), làm khách mất theo dõi vị
// trí. Trình duyệt/thiết bị không hỗ trợ (hoặc từ chối) thì bỏ qua âm thầm,
// không chặn luồng chạy chuyến.
export function useWakeLock(active: boolean) {
  const sentinelRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!active || typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    let cancelled = false;

    const request = async () => {
      try {
        const sentinel = await navigator.wakeLock.request("screen");
        if (cancelled) {
          sentinel.release().catch(() => {});
          return;
        }
        sentinelRef.current = sentinel;
      } catch {
        // Bị từ chối (vd. tab không active lúc gọi) — sẽ thử lại khi quay lại tab.
      }
    };
    request();

    // Wake Lock tự nhả khi tab bị ẩn (đúng theo spec) — xin lại ngay khi tài xế
    // quay lại tab, nếu vẫn đang trong lúc cần giữ màn hình sáng.
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") request();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      sentinelRef.current?.release().catch(() => {});
      sentinelRef.current = null;
    };
  }, [active]);
}

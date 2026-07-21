import { useEffect, useRef } from "react";
import { updateDriverLocation } from "@/lib/queries";

// Khoảng cách tối thiểu (mét) phải di chuyển mới gửi cập nhật — tránh spam
// server khi tài xế đứng yên (GPS luôn nhiễu vài mét).
const MIN_DISTANCE_M = 25;
// Khoảng thời gian tối thiểu giữa 2 lần gửi, kể cả khi di chuyển nhanh.
const MIN_INTERVAL_MS = 8000;

/**
 * Theo dõi GPS của tài xế và gửi lên server khi `active` = true.
 * Tự dừng khi tài xế offline / không có chuyến để tiết kiệm pin và băng thông.
 *
 * `onPosition` (tuỳ chọn) bắn ở MỖI lần GPS đọc được, tách biệt với việc gửi
 * server (vẫn throttle 25m/8s như cũ) — dùng để hiển thị khoảng cách/ETA
 * "sống" ngay trên máy tài xế mà không cần đợi vòng round-trip lên database.
 */
export function useLocationTracking(
  active: boolean,
  onPosition?: (pos: { lat: number; lng: number }) => void,
) {
  const lastSentRef = useRef<{ lat: number; lng: number; at: number } | null>(null);
  const onPositionRef = useRef(onPosition);
  onPositionRef.current = onPosition;

  useEffect(() => {
    if (!active) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        onPositionRef.current?.({ lat, lng });

        const now = Date.now();
        const last = lastSentRef.current;

        if (last) {
          const movedEnough = distanceMeters(last, { lat, lng }) >= MIN_DISTANCE_M;
          const waitedEnough = now - last.at >= MIN_INTERVAL_MS;
          if (!movedEnough || !waitedEnough) return;
        }

        lastSentRef.current = { lat, lng, at: now };
        updateDriverLocation(lat, lng).catch(() => {
          // Mạng chập chờn — bỏ qua lần này, lần cập nhật sau sẽ gửi lại.
        });
      },
      () => {
        // Tài xế từ chối quyền vị trí hoặc GPS lỗi: không chặn luồng chạy chuyến,
        // chỉ là khách sẽ không thấy xe di chuyển trên bản đồ.
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
    // onPosition cố ý không nằm trong deps: dùng ref để tránh việc component
    // cha truyền hàm mới mỗi lần render làm watchPosition bị khởi động lại.
  }, [active]);
}

function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

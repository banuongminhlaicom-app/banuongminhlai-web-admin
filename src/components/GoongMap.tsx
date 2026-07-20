import { useEffect, useRef } from "react";
import { MapPreview } from "@/components/MapPreview";
import {
  decodePolyline,
  isGoongMapConfigured,
  loadGoongMapSdk,
  MAP_STYLE,
  type GoongMapInstance,
  type GoongMarker,
} from "@/lib/goong-map";
import { cn } from "@/lib/utils";

export interface Coord {
  lat: number;
  lng: number;
}

// Bản đồ Goong tương tác: marker điểm đón/đến, marker xe tài xế (realtime),
// vẽ tuyến đường. Nếu chưa cấu hình Maptiles key thì rơi về MapPreview (ảnh
// bản đồ tĩnh cũ) — giao diện không vỡ, luồng đặt xe vẫn chạy như trước.
export function GoongMap({
  className,
  pickup,
  dropoff,
  driver,
  routePolyline,
  fallbackProps,
}: {
  className?: string;
  pickup?: Coord | null;
  dropoff?: Coord | null;
  driver?: Coord | null;
  routePolyline?: string | null;
  fallbackProps?: { showRoute?: boolean; driverPin?: boolean; showNearbyDrivers?: boolean };
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<GoongMapInstance | null>(null);
  const markersRef = useRef<Record<string, GoongMarker>>({});
  const readyRef = useRef(false);

  // Khởi tạo bản đồ 1 lần.
  useEffect(() => {
    if (!isGoongMapConfigured || !containerRef.current) return;
    let disposed = false;

    loadGoongMapSdk()
      .then((goongjs) => {
        if (disposed || !containerRef.current) return;
        const center = pickup ?? dropoff ?? { lat: 10.457, lng: 105.634 };
        const map = new goongjs.Map({
          container: containerRef.current,
          style: MAP_STYLE,
          center: [center.lng, center.lat],
          zoom: 14,
        });
        map.on("load", () => {
          readyRef.current = true;
          syncMap(goongjs, map);
        });
        mapRef.current = map;
      })
      .catch(() => {
        // Không tải được SDK — giữ nguyên khung trống, fallback bên dưới lo phần hiển thị.
      });

    return () => {
      disposed = true;
      readyRef.current = false;
      Object.values(markersRef.current).forEach((m) => m.remove());
      markersRef.current = {};
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // Chỉ dựng bản đồ 1 lần; mọi cập nhật sau đó do effect bên dưới xử lý.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cập nhật marker + tuyến đường mỗi khi toạ độ đổi (vd. xe tài xế di chuyển).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current || !window.goongjs) return;
    syncMap(window.goongjs, map);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    pickup?.lat,
    pickup?.lng,
    dropoff?.lat,
    dropoff?.lng,
    driver?.lat,
    driver?.lng,
    routePolyline,
  ]);

  function syncMap(goongjs: NonNullable<typeof window.goongjs>, map: GoongMapInstance) {
    const put = (key: string, coord: Coord | null | undefined, color: string) => {
      if (!coord) {
        markersRef.current[key]?.remove();
        delete markersRef.current[key];
        return;
      }
      const existing = markersRef.current[key];
      if (existing) {
        existing.setLngLat([coord.lng, coord.lat]);
      } else {
        markersRef.current[key] = new goongjs.Marker({ color })
          .setLngLat([coord.lng, coord.lat])
          .addTo(map);
      }
    };

    put("pickup", pickup, "#ef4444");
    put("dropoff", dropoff, "#22c55e");
    put("driver", driver, "#1f2937");

    // Vẽ tuyến đường từ polyline mã hoá của Goong Directions.
    if (routePolyline) {
      try {
        const coords = decodePolyline(routePolyline);
        const geojson = {
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: coords },
        };
        const source = map.getSource("route");
        if (source) {
          source.setData(geojson);
        } else {
          map.addSource("route", { type: "geojson", data: geojson });
          map.addLayer({
            id: "route",
            type: "line",
            source: "route",
            layout: { "line-join": "round", "line-cap": "round" },
            paint: { "line-color": "#ef4444", "line-width": 4, "line-opacity": 0.85 },
          });
        }
      } catch {
        // Polyline hỏng — bỏ qua phần vẽ tuyến, marker vẫn hiển thị bình thường.
      }
    }

    // Căn khung nhìn ôm trọn các điểm đang có.
    const points = [pickup, dropoff, driver].filter((c): c is Coord => !!c);
    if (points.length >= 2) {
      const bounds = new goongjs.LngLatBounds(
        [points[0].lng, points[0].lat],
        [points[0].lng, points[0].lat],
      );
      points.forEach((c) => bounds.extend([c.lng, c.lat]));
      map.fitBounds(bounds, { padding: 60, maxZoom: 16, duration: 600 });
    }
  }

  // Chưa cấu hình Maptiles key → dùng bản đồ tĩnh cũ để giao diện không trống.
  if (!isGoongMapConfigured) {
    return <MapPreview className={className} {...fallbackProps} />;
  }

  return <div ref={containerRef} className={cn("bg-muted", className)} />;
}

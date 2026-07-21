import { useEffect, useRef, useState } from "react";
import { LocateFixed } from "lucide-react";
import { MapPreview } from "@/components/MapPreview";
import {
  computeBearing,
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
  navigate,
  fallbackProps,
}: {
  className?: string;
  pickup?: Coord | null;
  dropoff?: Coord | null;
  driver?: Coord | null;
  routePolyline?: string | null;
  // Chế độ dẫn đường: camera nghiêng (pitch) + xoay theo hướng xe chạy (bearing),
  // bám sát vị trí tài xế thay vì canh khung nhìn ôm trọn điểm đón/đến/xe.
  navigate?: boolean;
  fallbackProps?: { showRoute?: boolean; driverPin?: boolean; showNearbyDrivers?: boolean };
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<GoongMapInstance | null>(null);
  const markersRef = useRef<Record<string, GoongMarker>>({});
  const readyRef = useRef(false);
  const prevDriverRef = useRef<Coord | null>(null);
  const bearingRef = useRef(0);
  const driverRef = useRef<Coord | null | undefined>(driver);
  driverRef.current = driver;

  // Chế độ dẫn đường: camera tự bám vị trí xe (mặc định) cho tới khi người
  // dùng tự kéo/vuốt bản đồ — lúc đó ngừng bám để họ xem tự do, nút định vị
  // chuyển màu xám; bấm nút sẽ khoá camera trở lại vị trí xe.
  const [autoTracking, setAutoTracking] = useState(true);
  useEffect(() => {
    if (navigate) setAutoTracking(true);
  }, [navigate]);

  // Khởi tạo bản đồ 1 lần.
  useEffect(() => {
    if (!isGoongMapConfigured || !containerRef.current) return;
    let disposed = false;

    loadGoongMapSdk()
      .then((goongjs) => {
        if (disposed || !containerRef.current) return;
        const center = pickup ?? dropoff ?? { lat: 10.457, lng: 105.634 };
        // Chế độ dẫn đường: vào thẳng góc nhìn 3D nghiêng/cận cảnh ngay từ đầu,
        // không đợi easeTo đầu tiên mới nghiêng lên (tránh khựng 2D rồi mới 3D).
        const map = new goongjs.Map({
          container: containerRef.current,
          style: MAP_STYLE,
          center: [center.lng, center.lat],
          zoom: navigate ? 18 : 14,
          pitch: navigate ? 60 : 0,
        });
        map.on("load", () => {
          readyRef.current = true;
          syncMap(goongjs, map);
        });
        // Chỉ dùng "dragstart" để phát hiện thao tác tự do của người dùng —
        // sự kiện này CHỈ bắn khi người dùng thật sự kéo bản đồ, không bao giờ
        // bắn do code tự gọi easeTo/flyTo. Từng thử thêm zoomstart/rotatestart
        // (lọc qua originalEvent) nhưng chính easeTo tự động của auto-tracking
        // cũng có thể kích hoạt các sự kiện đó, tự tắt auto-tracking ngoài ý
        // muốn rồi làm camera đứng yên ở góc phẳng — bỏ hẳn cho chắc.
        map.on("dragstart", () => setAutoTracking(false));
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
  // Nếu bản đồ chưa sẵn sàng, hoãn tới sự kiện "load" — nếu bỏ qua luôn thì dữ
  // liệu về sớm hơn bản đồ sẽ không bao giờ được vẽ.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.goongjs) return;
    const g = window.goongjs;
    if (!readyRef.current) {
      map.once("load", () => syncMap(g, map));
      return;
    }
    syncMap(g, map);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    pickup?.lat,
    pickup?.lng,
    dropoff?.lat,
    dropoff?.lng,
    driver?.lat,
    driver?.lng,
    routePolyline,
    navigate,
    autoTracking,
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

    if (routePolyline) drawRoute(map, routePolyline);

    if (navigate) {
      // QUAN TRỌNG: ở chế độ dẫn đường, KHÔNG BAO GIỜ được rơi xuống fitBounds
      // bên dưới — fitBounds luôn đưa camera về góc nhìn phẳng top-down, xoá
      // mất pitch/bearing (đây chính là lý do bản đồ bị "phẳng lại" dù đã set
      // pitch: 60 — driver GPS chưa kịp về nhưng pickup+dropoff đã có sẵn 2
      // điểm nên nhánh cũ vẫn tính fitBounds như thường). Chưa có vị trí tài
      // xế thì tạm lấy điểm đón/đến làm tâm, vẫn giữ nguyên góc nghiêng 3D.
      const focus = driver ?? pickup ?? dropoff;
      if (driver) {
        // Luôn cập nhật hướng di chuyển (kể cả lúc không tự bám) để nút định vị
        // luôn xoay camera đúng hướng xe ngay khi bấm — chỉ tính lại khi đã đi
        // đủ xa (~8m) so với lần trước, tránh hướng bị nhiễu lúc gần như đứng yên.
        const prev = prevDriverRef.current;
        if (prev) {
          const movedM = Math.hypot(driver.lat - prev.lat, driver.lng - prev.lng) * 111_000; // ước lượng nhanh, đủ dùng để so ngưỡng
          if (movedM > 8) {
            bearingRef.current = computeBearing(prev, driver);
            prevDriverRef.current = driver;
          }
        } else {
          prevDriverRef.current = driver;
        }
      }
      // Chỉ tự kéo camera khi đang bật auto-tracking — người dùng đang xem tự
      // do (đã kéo/vuốt bản đồ) thì để yên cho tới khi họ bấm nút định vị.
      if (autoTracking && focus) {
        map.easeTo({
          center: [focus.lng, focus.lat],
          zoom: 18,
          pitch: 60,
          bearing: bearingRef.current,
          duration: 900,
        });
      }
      return;
    }

    // Chế độ thường: căn khung nhìn ôm trọn các điểm đang có.
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

  // Vẽ tuyến đường lên bản đồ. Sự kiện "load" báo bản đồ sẵn sàng nhưng style
  // có thể chưa nạp xong — addSource/addLayer lúc đó sẽ ném lỗi và tuyến không
  // hiện (đúng lỗi đã gặp ở màn tài xế). Nên kiểm tra isStyleLoaded() và hoãn
  // lại tới sự kiện "idle" nếu chưa sẵn sàng.
  function drawRoute(map: GoongMapInstance, polyline: string, attempt = 0) {
    if (!map.isStyleLoaded()) {
      // Giới hạn số lần hoãn để không lặp vô hạn nếu style hỏng hẳn.
      if (attempt < 5) map.once("idle", () => drawRoute(map, polyline, attempt + 1));
      return;
    }
    try {
      const geojson = {
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: decodePolyline(polyline) },
      };
      const source = map.getSource("route");
      if (source) {
        source.setData(geojson);
        return;
      }
      map.addSource("route", { type: "geojson", data: geojson });
      map.addLayer({
        id: "route",
        type: "line",
        source: "route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#ef4444", "line-width": 4, "line-opacity": 0.85 },
      });
    } catch (err) {
      // Không nuốt lỗi im lặng như trước — ghi log để còn chẩn đoán được.
      console.error("GoongMap: không vẽ được tuyến đường", err);
    }
  }

  // Kéo camera mượt về lại vị trí xe, xoay theo hướng đang di chuyển, rồi bật
  // lại auto-tracking. Dùng flyTo (mượt/uốn cong hơn easeTo) vì đây là hành
  // động 1 lần theo yêu cầu người dùng, không phải cập nhật liên tục mỗi nhịp GPS.
  const handleRecenter = () => {
    const map = mapRef.current;
    const pos = driverRef.current;
    if (!map || !pos) return;
    map.flyTo({
      center: [pos.lng, pos.lat],
      zoom: 18,
      pitch: 60,
      bearing: bearingRef.current,
      duration: 900,
    });
    setAutoTracking(true);
  };

  // Chưa cấu hình Maptiles key → dùng bản đồ tĩnh cũ để giao diện không trống.
  if (!isGoongMapConfigured) {
    return <MapPreview className={className} {...fallbackProps} />;
  }

  const mapEl = <div ref={containerRef} className={cn("bg-muted", className)} />;
  if (!navigate) return mapEl;

  return (
    // className (vị trí/kích thước bản đồ) đã nằm trên mapEl bên trong; wrapper
    // này chỉ cần lấp đầy đúng chỗ đó để làm điểm neo cho nút định vị — dùng
    // style trực tiếp thay vì class Tailwind để tránh twMerge xung đột với các
    // class position (absolute/relative) mà caller đã đặt trên mapEl.
    <div style={{ position: "relative", height: "100%", width: "100%" }}>
      {mapEl}
      <button
        type="button"
        onClick={handleRecenter}
        aria-label={autoTracking ? "Đang bám theo vị trí xe" : "Về lại vị trí xe"}
        className={cn(
          "absolute bottom-28 right-4 z-10 grid h-12 w-12 place-items-center rounded-full shadow-elevated transition-colors active:scale-95",
          autoTracking
            ? "gradient-primary text-primary-foreground"
            : "bg-surface text-muted-foreground",
        )}
      >
        <LocateFixed className="h-5 w-5" />
      </button>
    </div>
  );
}

import { useEffect, useRef } from "react";
import { isGoongMapConfigured, loadGoongMapSdk, MAP_STYLE, type GoongMapInstance, type GoongMarker } from "@/lib/goong-map";
import type { LiveDriverRow, LiveTripRow } from "@/lib/queries";
import { cn } from "@/lib/utils";

// Bản đồ tổng quan cho admin: NHIỀU tài xế online (GPS thật) + NHIỀU chuyến
// đang diễn ra (điểm đón tĩnh, khách không gửi GPS) cùng lúc trên 1 bản đồ —
// khác hẳn GoongMap.tsx (chỉ vẽ đúng 1 chuyến: đón/đến/tài xế + tuyến đường,
// dùng cho luồng đặt xe/dẫn đường của khách và tài xế). Không dùng chung
// component đó vì logic quản lý marker (1 driver cố định) không khớp nhu cầu
// ở đây (danh sách driver/trip thay đổi động theo thời gian thực).
function makeDriverMarkerEl(name: string) {
  const wrap = document.createElement("div");
  wrap.style.display = "flex";
  wrap.style.flexDirection = "column";
  wrap.style.alignItems = "center";
  wrap.style.pointerEvents = "none";
  wrap.innerHTML = `
    <div style="width:16px;height:16px;border-radius:9999px;background:#2563eb;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>
    <div style="margin-top:2px;padding:2px 6px;border-radius:9999px;background:#111827;color:white;font-size:10px;font-weight:700;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,0.3);">${name}</div>
  `;
  return wrap;
}

function makeTripMarkerEl(name: string) {
  const wrap = document.createElement("div");
  wrap.style.display = "flex";
  wrap.style.flexDirection = "column";
  wrap.style.alignItems = "center";
  wrap.style.pointerEvents = "none";
  wrap.innerHTML = `
    <div style="width:14px;height:14px;border-radius:9999px;background:#ef4444;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>
    <div style="margin-top:2px;padding:2px 6px;border-radius:9999px;background:#ef4444;color:white;font-size:10px;font-weight:700;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,0.3);">${name}</div>
  `;
  return wrap;
}

export function AdminLiveMap({
  drivers,
  trips,
  className,
}: {
  drivers: LiveDriverRow[];
  trips: LiveTripRow[];
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<GoongMapInstance | null>(null);
  const driverMarkersRef = useRef<Record<string, GoongMarker>>({});
  const tripMarkersRef = useRef<Record<string, GoongMarker>>({});
  const readyRef = useRef(false);
  const firstFitDoneRef = useRef(false);
  const dataRef = useRef({ drivers, trips });
  dataRef.current = { drivers, trips };

  useEffect(() => {
    if (!isGoongMapConfigured || !containerRef.current) return;
    let disposed = false;

    loadGoongMapSdk()
      .then((goongjs) => {
        if (disposed || !containerRef.current) return;
        const map = new goongjs.Map({
          container: containerRef.current,
          style: MAP_STYLE,
          center: [105.634, 10.457],
          zoom: 13,
          pitch: 0,
          attributionControl: false,
        });
        map.on("load", () => {
          readyRef.current = true;
          sync(goongjs, map);
        });
        mapRef.current = map;
      })
      .catch(() => {
        // Không tải được SDK — khung để trống, không chặn phần còn lại của trang.
      });

    return () => {
      disposed = true;
      readyRef.current = false;
      Object.values(driverMarkersRef.current).forEach((m) => m.remove());
      Object.values(tripMarkersRef.current).forEach((m) => m.remove());
      driverMarkersRef.current = {};
      tripMarkersRef.current = {};
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const g = window.goongjs;
    if (!map || !g || !readyRef.current) return;
    sync(g, map);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drivers, trips]);

  function sync(goongjs: NonNullable<typeof window.goongjs>, map: GoongMapInstance) {
    const { drivers, trips } = dataRef.current;
    const bounds: [number, number][] = [];

    const liveDriverIds = new Set<string>();
    for (const d of drivers) {
      if (d.current_lat == null || d.current_lng == null) continue;
      liveDriverIds.add(d.id);
      const lngLat: [number, number] = [d.current_lng, d.current_lat];
      bounds.push(lngLat);
      const existing = driverMarkersRef.current[d.id];
      if (existing) {
        existing.setLngLat(lngLat);
      } else {
        driverMarkersRef.current[d.id] = new goongjs.Marker({
          element: makeDriverMarkerEl(d.full_name ?? "Tài xế"),
          anchor: "bottom",
        })
          .setLngLat(lngLat)
          .addTo(map);
      }
    }
    for (const id of Object.keys(driverMarkersRef.current)) {
      if (!liveDriverIds.has(id)) {
        driverMarkersRef.current[id].remove();
        delete driverMarkersRef.current[id];
      }
    }

    const liveTripIds = new Set<string>();
    for (const t of trips) {
      if (t.pickup_lat == null || t.pickup_lng == null) continue;
      liveTripIds.add(t.id);
      const lngLat: [number, number] = [t.pickup_lng, t.pickup_lat];
      bounds.push(lngLat);
      const existing = tripMarkersRef.current[t.id];
      if (existing) {
        existing.setLngLat(lngLat);
      } else {
        tripMarkersRef.current[t.id] = new goongjs.Marker({
          element: makeTripMarkerEl(t.customer_name ?? "Khách hàng"),
          anchor: "bottom",
        })
          .setLngLat(lngLat)
          .addTo(map);
      }
    }
    for (const id of Object.keys(tripMarkersRef.current)) {
      if (!liveTripIds.has(id)) {
        tripMarkersRef.current[id].remove();
        delete tripMarkersRef.current[id];
      }
    }

    // Chỉ tự canh khung nhìn 1 lần lúc có dữ liệu đầu tiên — tránh camera giật
    // liên tục mỗi khi tài xế nhích GPS.
    if (!firstFitDoneRef.current && bounds.length > 0) {
      firstFitDoneRef.current = true;
      if (bounds.length === 1) {
        map.easeTo({ center: bounds[0], zoom: 14, duration: 600 });
      } else {
        const b = new goongjs.LngLatBounds(bounds[0], bounds[0]);
        bounds.forEach((c) => b.extend(c));
        map.fitBounds(b, { padding: 60, maxZoom: 15, duration: 600 });
      }
    }
  }

  if (!isGoongMapConfigured) {
    return (
      <div className={cn("grid place-items-center rounded-3xl bg-surface text-sm text-muted-foreground", className)}>
        Chưa cấu hình VITE_GOONG_MAPTILES_KEY.
      </div>
    );
  }

  return <div ref={containerRef} className={cn("h-full w-full bg-muted", className)} />;
}

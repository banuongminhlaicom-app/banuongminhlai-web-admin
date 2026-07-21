// Nạp Goong JS SDK (bản fork của mapbox-gl) 1 lần duy nhất, kể cả khi nhiều
// component cùng gọi. Maptiles Key khác với API Key (REST) — Goong tách 2 loại.

const MAPTILES_KEY = import.meta.env.VITE_GOONG_MAPTILES_KEY;
const SDK_VERSION = "1.0.9";
const SDK_JS = `https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@${SDK_VERSION}/dist/goong-js.js`;
const SDK_CSS = `https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@${SDK_VERSION}/dist/goong-js.css`;

export const MAP_STYLE = "https://tiles.goong.io/assets/goong_map_web.json";
export const isGoongMapConfigured = Boolean(MAPTILES_KEY);

// SDK là fork mapbox-gl nên API giống mapbox: Map, Marker, LngLatBounds...
// Khai kiểu tối thiểu đủ dùng, tránh kéo cả @types/mapbox-gl vào dự án.
export interface GoongMarker {
  setLngLat(lngLat: [number, number]): GoongMarker;
  addTo(map: GoongMapInstance): GoongMarker;
  remove(): void;
}

export interface GoongMapEvent {
  // Chỉ có khi sự kiện bắt nguồn từ thao tác thật của người dùng (kéo/chạm/lăn
  // chuột) — easeTo/flyTo do code gọi thì không có, dùng để phân biệt 2 loại.
  originalEvent?: unknown;
}

export interface GoongMapInstance {
  on(event: string, cb: (e: GoongMapEvent) => void): void;
  once(event: string, cb: (e: GoongMapEvent) => void): void;
  remove(): void;
  addSource(id: string, source: unknown): void;
  addLayer(layer: unknown): void;
  getSource(id: string): { setData(data: unknown): void } | undefined;
  getLayer(id: string): unknown;
  removeLayer(id: string): void;
  removeSource(id: string): void;
  fitBounds(bounds: unknown, options?: unknown): void;
  easeTo(options: Record<string, unknown>): void;
  flyTo(options: Record<string, unknown>): void;
  isStyleLoaded(): boolean;
}

interface GoongJs {
  accessToken: string;
  Map: new (options: Record<string, unknown>) => GoongMapInstance;
  Marker: new (options?: Record<string, unknown>) => GoongMarker;
  LngLatBounds: new (
    sw: [number, number],
    ne: [number, number],
  ) => {
    extend(coord: [number, number]): void;
  };
}

declare global {
  interface Window {
    goongjs?: GoongJs;
  }
}

let loadPromise: Promise<GoongJs> | null = null;

export function loadGoongMapSdk(): Promise<GoongJs> {
  if (!isGoongMapConfigured) {
    return Promise.reject(new Error("Thiếu VITE_GOONG_MAPTILES_KEY."));
  }
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Bản đồ chỉ nạp được ở phía trình duyệt."));
  }
  if (window.goongjs) {
    window.goongjs.accessToken = MAPTILES_KEY;
    return Promise.resolve(window.goongjs);
  }
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    if (!document.querySelector(`link[href="${SDK_CSS}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = SDK_CSS;
      document.head.appendChild(link);
    }
    const script = document.createElement("script");
    script.src = SDK_JS;
    script.async = true;
    script.onload = () => {
      if (window.goongjs) {
        window.goongjs.accessToken = MAPTILES_KEY;
        resolve(window.goongjs);
      } else {
        reject(new Error("Đã tải goong-js nhưng không thấy window.goongjs."));
      }
    };
    script.onerror = () => reject(new Error("Không tải được Goong JS SDK."));
    document.head.appendChild(script);
  });

  return loadPromise;
}

// Hướng di chuyển (độ, 0 = Bắc) giữa 2 toạ độ GPS liên tiếp — dùng để xoay
// camera bám theo hướng xe chạy ở chế độ dẫn đường (giống Google Maps).
export function computeBearing(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): number {
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  const deg = (Math.atan2(y, x) * 180) / Math.PI;
  return (deg + 360) % 360;
}

// Giải mã chuỗi polyline (chuẩn Encoded Polyline của Google, Goong dùng chung)
// thành mảng toạ độ [lng, lat] để vẽ tuyến đường lên bản đồ.
export function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let result = 1;
    let shift = 0;
    let b: number;
    do {
      b = encoded.charCodeAt(index++) - 63 - 1;
      result += b << shift;
      shift += 5;
    } while (b >= 0x1f);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    result = 1;
    shift = 0;
    do {
      b = encoded.charCodeAt(index++) - 63 - 1;
      result += b << shift;
      shift += 5;
    } while (b >= 0x1f);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push([lng * 1e-5, lat * 1e-5]);
  }
  return points;
}

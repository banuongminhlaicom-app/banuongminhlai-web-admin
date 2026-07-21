// Lớp bản đồ dùng Goong.io (dịch vụ bản đồ Việt Nam) — thay Google Maps để
// tối ưu chi phí + dữ liệu địa chỉ VN tốt cho Cao Lãnh. Gọi REST trực tiếp từ
// trình duyệt (Goong dùng api_key trong URL, không chặn theo referer như Google).
// Giữ nguyên interface PlaceSuggestion để booking.tsx không phải đổi.

import { cachedFetch, createRateLimiter } from "./api-cache";

const GOONG_KEY = import.meta.env.VITE_GOONG_API_KEY;
const GOONG_BASE = "https://rsapi.goong.io";

// Cao Lãnh, Đồng Tháp — tâm khu vực để ưu tiên gợi ý địa chỉ quanh đây.
const CENTER = { lat: 10.457, lng: 105.634 };

export const isMapConfigured = Boolean(GOONG_KEY);

// Thời gian sống của cache, đặt theo mức độ "ổn định" của từng loại dữ liệu:
// tên đường/địa danh gần như không đổi, nên cache lâu hơn tuyến đường (có thể
// thay đổi theo tình hình giao thông).
const TTL_AUTOCOMPLETE = 30 * 60 * 1000; // 30 phút
const TTL_PLACE_DETAIL = 24 * 60 * 60 * 1000; // 24 giờ — toạ độ 1 địa điểm gần như cố định
const TTL_GEOCODE = 60 * 60 * 1000; // 1 giờ
const TTL_ROUTE = 10 * 60 * 1000; // 10 phút

// Autocomplete tốn lượt nhất vì gõ mỗi chữ là một lượt gọi. Cho phép bùng 10
// lượt liên tiếp (người dùng gõ nhanh một địa chỉ dài), sau đó giới hạn ~2
// lượt/giây. Các API còn lại thưa hơn nhiều nên nới rộng hơn.
const allowAutocomplete = createRateLimiter(10, 2);
const allowOtherApis = createRateLimiter(20, 5);

export interface PlaceSuggestion {
  id: string;
  label: string;
  // Lấy địa chỉ đầy đủ + toạ độ thật khi người dùng chọn gợi ý này.
  resolve: () => Promise<{ address: string; coord: { lat: number; lng: number } | null }>;
}

interface GoongPrediction {
  place_id: string;
  description: string;
}

// Gõ tìm địa chỉ — trả về danh sách gợi ý (Goong Place Autocomplete).
// Gõ lùi/gõ lại cùng một chuỗi sẽ lấy từ cache, không tốn thêm lượt gọi.
export async function fetchPlaceSuggestions(input: string): Promise<PlaceSuggestion[]> {
  const query = input.trim();
  if (!isMapConfigured || query.length < 2) return [];

  // Chuẩn hoá key để "Chợ Cao Lãnh" và "chợ  cao lãnh" dùng chung một cache.
  const cacheKey = `ac:${query.toLowerCase().replace(/\s+/g, " ")}`;

  const predictions = await cachedFetch<GoongPrediction[]>(cacheKey, TTL_AUTOCOMPLETE, async () => {
    if (!allowAutocomplete()) throw new Error("Gọi Goong quá nhanh, bỏ qua lượt này.");
    const url =
      `${GOONG_BASE}/Place/AutoComplete?api_key=${GOONG_KEY}` +
      `&input=${encodeURIComponent(query)}` +
      `&location=${CENTER.lat},${CENTER.lng}&radius=50&more_compound=true`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Goong AutoComplete lỗi ${res.status}`);
    const data = (await res.json()) as { predictions?: GoongPrediction[] };
    return data.predictions ?? [];
  });

  return predictions.map((p) => ({
    id: p.place_id,
    label: p.description,
    resolve: () => resolvePlace(p.place_id, p.description),
  }));
}

// Lấy toạ độ + địa chỉ đầy đủ của 1 place (Goong Place Detail).
async function resolvePlace(placeId: string, fallbackLabel: string) {
  try {
    const data = await cachedFetch<{
      result?: {
        formatted_address?: string;
        name?: string;
        geometry?: { location?: { lat: number; lng: number } };
      };
    }>(`detail:${placeId}`, TTL_PLACE_DETAIL, async () => {
      if (!allowOtherApis()) throw new Error("Gọi Goong quá nhanh, bỏ qua lượt này.");
      const url = `${GOONG_BASE}/Place/Detail?place_id=${encodeURIComponent(placeId)}&api_key=${GOONG_KEY}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Goong Detail lỗi ${res.status}`);
      return res.json();
    });
    const loc = data.result?.geometry?.location;
    return {
      address: data.result?.formatted_address ?? data.result?.name ?? fallbackLabel,
      coord: loc ? { lat: loc.lat, lng: loc.lng } : null,
    };
  } catch {
    // Không lấy được chi tiết — vẫn dùng text gợi ý, chỉ thiếu toạ độ nên giá
    // sẽ tính theo ước lượng thay vì khoảng cách thật.
    return { address: fallbackLabel, coord: null };
  }
}

export interface RouteStep {
  // Goong trả sẵn tiếng Việt, dạng chữ thuần — vẫn strip thẻ HTML phòng khi có.
  instruction: string;
  maneuver: string | null;
  end: { lat: number; lng: number };
}

// Tính khoảng cách + thời gian thật giữa 2 điểm (Goong Directions). Nếu Goong
// lỗi mà vẫn có toạ độ thì ước lượng bằng đường chim bay × hệ số đường bộ.
export async function fetchRoute(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
): Promise<{
  distanceKm: number;
  durationMin: number;
  polyline?: string | null;
  steps?: RouteStep[];
} | null> {
  if (isMapConfigured) {
    try {
      // Làm tròn toạ độ tới ~11m khi tạo key: GPS luôn nhiễu vài mét, nếu dùng
      // toạ độ thô thì mỗi lần lệch 1m lại tính là tuyến mới và gọi lại API.
      const k = (c: { lat: number; lng: number }) => `${c.lat.toFixed(4)},${c.lng.toFixed(4)}`;
      const data = await cachedFetch<{
        routes?: {
          overview_polyline?: { points?: string };
          legs?: {
            distance?: { value: number };
            duration?: { value: number };
            steps?: {
              html_instructions?: string;
              maneuver?: string;
              end_location?: { lat: number; lng: number };
            }[];
          }[];
        }[];
      }>(`route:${k(origin)}>${k(destination)}`, TTL_ROUTE, async () => {
        if (!allowOtherApis()) throw new Error("Gọi Goong quá nhanh, bỏ qua lượt này.");
        const url =
          `${GOONG_BASE}/Direction?origin=${origin.lat},${origin.lng}` +
          `&destination=${destination.lat},${destination.lng}&vehicle=car&api_key=${GOONG_KEY}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Goong Direction lỗi ${res.status}`);
        return res.json();
      });
      const route = data.routes?.[0];
      const leg = route?.legs?.[0];
      if (leg?.distance) {
        return {
          distanceKm: (leg.distance.value ?? 0) / 1000,
          durationMin: (leg.duration?.value ?? 0) / 60,
          polyline: route?.overview_polyline?.points ?? null,
          steps: (leg.steps ?? [])
            .filter((s) => s.end_location)
            .map((s) => ({
              instruction: (s.html_instructions ?? "").replace(/<[^>]+>/g, "").trim(),
              maneuver: s.maneuver ?? null,
              end: { lat: s.end_location!.lat, lng: s.end_location!.lng },
            })),
        };
      }
    } catch {
      // rơi xuống ước lượng bên dưới
    }
  }
  // Ước lượng dự phòng: đường chim bay × 1.3 (hệ số đường bộ), ~30 km/h.
  const km = haversineKm(origin, destination) * 1.3;
  if (km <= 0) return null;
  return { distanceKm: km, durationMin: (km / 30) * 60 };
}

// Đổi toạ độ GPS thành địa chỉ đọc được (Goong Geocoding).
export async function reverseGeocode(coord: { lat: number; lng: number }): Promise<string | null> {
  if (!isMapConfigured) return null;
  try {
    // Cùng lý do làm tròn như tuyến đường: đứng yên một chỗ mà GPS nhiễu vài
    // mét thì không nên gọi lại API.
    const key = `geo:${coord.lat.toFixed(4)},${coord.lng.toFixed(4)}`;
    const data = await cachedFetch<{ results?: { formatted_address?: string }[] }>(
      key,
      TTL_GEOCODE,
      async () => {
        if (!allowOtherApis()) throw new Error("Gọi Goong quá nhanh, bỏ qua lượt này.");
        const url = `${GOONG_BASE}/Geocode?latlng=${coord.lat},${coord.lng}&api_key=${GOONG_KEY}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Goong Geocode lỗi ${res.status}`);
        return res.json();
      },
    );
    return data.results?.[0]?.formatted_address ?? null;
  } catch {
    return null;
  }
}

// Lấy vị trí GPS của thiết bị. Trình duyệt sẽ hỏi quyền truy cập vị trí.
export function getCurrentPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Thiết bị không hỗ trợ định vị."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        const msg =
          err.code === err.PERMISSION_DENIED
            ? "Bạn đã từ chối quyền truy cập vị trí. Hãy bật lại trong cài đặt trình duyệt."
            : err.code === err.TIMEOUT
              ? "Lấy vị trí quá lâu, vui lòng thử lại."
              : "Không lấy được vị trí hiện tại.";
        reject(new Error(msg));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  });
}

// Đường chim bay giữa 2 toạ độ — dùng riêng, không tốn API, để tính khoảng
// cách còn lại "sống" theo từng nhịp GPS mà không phải gọi lại Directions.
export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

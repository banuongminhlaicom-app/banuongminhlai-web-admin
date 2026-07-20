// Lớp bản đồ dùng Goong.io (dịch vụ bản đồ Việt Nam) — thay Google Maps để
// tối ưu chi phí + dữ liệu địa chỉ VN tốt cho Cao Lãnh. Gọi REST trực tiếp từ
// trình duyệt (Goong dùng api_key trong URL, không chặn theo referer như Google).
// Giữ nguyên interface PlaceSuggestion để booking.tsx không phải đổi.

const GOONG_KEY = import.meta.env.VITE_GOONG_API_KEY;
const GOONG_BASE = "https://rsapi.goong.io";

// Cao Lãnh, Đồng Tháp — tâm khu vực để ưu tiên gợi ý địa chỉ quanh đây.
const CENTER = { lat: 10.457, lng: 105.634 };

export const isMapConfigured = Boolean(GOONG_KEY);

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
export async function fetchPlaceSuggestions(input: string): Promise<PlaceSuggestion[]> {
  if (!isMapConfigured || input.trim().length < 2) return [];
  const url =
    `${GOONG_BASE}/Place/AutoComplete?api_key=${GOONG_KEY}` +
    `&input=${encodeURIComponent(input)}` +
    `&location=${CENTER.lat},${CENTER.lng}&radius=50&more_compound=true`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Goong AutoComplete lỗi ${res.status}`);
  const data = (await res.json()) as { predictions?: GoongPrediction[] };
  return (data.predictions ?? []).map((p) => ({
    id: p.place_id,
    label: p.description,
    resolve: () => resolvePlace(p.place_id, p.description),
  }));
}

// Lấy toạ độ + địa chỉ đầy đủ của 1 place (Goong Place Detail).
async function resolvePlace(placeId: string, fallbackLabel: string) {
  try {
    const url = `${GOONG_BASE}/Place/Detail?place_id=${encodeURIComponent(placeId)}&api_key=${GOONG_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Goong Detail lỗi ${res.status}`);
    const data = (await res.json()) as {
      result?: {
        formatted_address?: string;
        name?: string;
        geometry?: { location?: { lat: number; lng: number } };
      };
    };
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

// Tính khoảng cách + thời gian thật giữa 2 điểm (Goong Directions). Nếu Goong
// lỗi mà vẫn có toạ độ thì ước lượng bằng đường chim bay × hệ số đường bộ.
export async function fetchRoute(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
): Promise<{ distanceKm: number; durationMin: number; polyline?: string | null } | null> {
  if (isMapConfigured) {
    try {
      const url =
        `${GOONG_BASE}/Direction?origin=${origin.lat},${origin.lng}` +
        `&destination=${destination.lat},${destination.lng}&vehicle=car&api_key=${GOONG_KEY}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = (await res.json()) as {
          routes?: {
            overview_polyline?: { points?: string };
            legs?: { distance?: { value: number }; duration?: { value: number } }[];
          }[];
        };
        const route = data.routes?.[0];
        const leg = route?.legs?.[0];
        if (leg?.distance) {
          return {
            distanceKm: (leg.distance.value ?? 0) / 1000,
            durationMin: (leg.duration?.value ?? 0) / 60,
            polyline: route?.overview_polyline?.points ?? null,
          };
        }
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
    const url = `${GOONG_BASE}/Geocode?latlng=${coord.lat},${coord.lng}&api_key=${GOONG_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as { results?: { formatted_address?: string }[] };
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

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

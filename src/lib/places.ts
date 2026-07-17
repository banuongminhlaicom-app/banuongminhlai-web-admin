import { isGoogleMapsConfigured, loadGoogleMaps } from "./google-maps";

// Gợi ý địa điểm đã chuẩn hoá, dùng chung cho cả Places API mới lẫn cũ để
// booking.tsx không phải biết đang chạy API nào.
export interface PlaceSuggestion {
  id: string;
  label: string;
  // Lấy địa chỉ đầy đủ + toạ độ thật khi người dùng chọn gợi ý này.
  resolve: () => Promise<{ address: string; coord: { lat: number; lng: number } | null }>;
}

// Cao Lãnh, Đồng Tháp — ưu tiên gợi ý quanh khu vực đang hoạt động.
const CENTER = { lat: 10.457, lng: 105.634 };
const RADIUS_M = 40000;

// Thử "Places API (New)" trước; nếu project chưa bật dịch vụ đó thì rơi về
// "Places API" cũ (nhiều project chỉ bật cái cũ). Giữ nguyên giao diện gọi hàm.
export async function fetchPlaceSuggestions(input: string): Promise<PlaceSuggestion[]> {
  if (!isGoogleMapsConfigured || input.trim().length < 2) return [];
  const g = await loadGoogleMaps();
  try {
    return await fetchViaNewApi(g, input);
  } catch {
    return await fetchViaLegacyApi(g, input);
  }
}

async function fetchViaNewApi(g: typeof google, input: string): Promise<PlaceSuggestion[]> {
  const { suggestions } = await g.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
    input,
    includedRegionCodes: ["vn"],
    language: "vi",
    locationBias: { center: CENTER, radius: RADIUS_M },
  });
  return suggestions
    .map((s) => s.placePrediction)
    .filter((p): p is google.maps.places.PlacePrediction => p != null)
    .map((p) => ({
      id: p.placeId,
      label: p.text.text,
      resolve: async () => {
        const place = p.toPlace();
        await place.fetchFields({ fields: ["location", "formattedAddress", "displayName"] });
        const loc = place.location;
        return {
          address: place.formattedAddress ?? place.displayName ?? p.text.text,
          coord: loc ? { lat: loc.lat(), lng: loc.lng() } : null,
        };
      },
    }));
}

async function fetchViaLegacyApi(g: typeof google, input: string): Promise<PlaceSuggestion[]> {
  const service = new g.maps.places.AutocompleteService();
  const res = await service.getPlacePredictions({
    input,
    componentRestrictions: { country: "vn" },
    locationBias: { center: CENTER, radius: RADIUS_M },
  });
  return res.predictions.map((p) => ({
    id: p.place_id,
    label: p.description,
    resolve: () => resolveLegacyPlace(g, p),
  }));
}

function resolveLegacyPlace(g: typeof google, p: google.maps.places.AutocompletePrediction) {
  return new Promise<{ address: string; coord: { lat: number; lng: number } | null }>((resolve) => {
    const service = new g.maps.places.PlacesService(document.createElement("div"));
    service.getDetails(
      { placeId: p.place_id, fields: ["geometry", "formatted_address", "name"] },
      (place, status) => {
        const loc = place?.geometry?.location;
        if (status === g.maps.places.PlacesServiceStatus.OK && loc) {
          resolve({
            address: place?.formatted_address ?? place?.name ?? p.description,
            coord: { lat: loc.lat(), lng: loc.lng() },
          });
        } else {
          // Không lấy được chi tiết — vẫn dùng text gợi ý, chỉ thiếu toạ độ nên
          // giá sẽ tính theo ước lượng thay vì khoảng cách thật.
          resolve({ address: p.description, coord: null });
        }
      },
    );
  });
}

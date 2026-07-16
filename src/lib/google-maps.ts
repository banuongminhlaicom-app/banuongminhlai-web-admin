const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

export const isGoogleMapsConfigured = Boolean(apiKey);

let loadPromise: Promise<typeof google> | null = null;

// Nạp Google Maps JS API (script tag) đúng 1 lần, kể cả khi nhiều component
// cùng gọi song song. Trả về google namespace khi script đã sẵn sàng.
export function loadGoogleMaps(): Promise<typeof google> {
  if (!isGoogleMapsConfigured) {
    return Promise.reject(
      new Error("Google Maps chưa được cấu hình (.env thiếu VITE_GOOGLE_MAPS_API_KEY)."),
    );
  }
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps chỉ nạp được ở phía trình duyệt."));
  }
  if (window.google?.maps) {
    return Promise.resolve(window.google);
  }
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=vi&region=VN`;
    script.async = true;
    script.onload = () => {
      if (window.google?.maps) resolve(window.google);
      else reject(new Error("Google Maps script đã tải nhưng không thấy window.google.maps."));
    };
    script.onerror = () => reject(new Error("Không tải được Google Maps script."));
    document.head.appendChild(script);
  });

  return loadPromise;
}

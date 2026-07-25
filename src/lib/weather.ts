// Thời tiết hiện tại qua Open-Meteo — miễn phí, không cần API key, đủ cho 1
// widget nhỏ trên Home. Mã "weathercode" theo chuẩn WMO mà Open-Meteo trả về.

export interface CurrentWeather {
  temperatureC: number;
  weatherCode: number;
}

export async function fetchCurrentWeather(coord: {
  lat: number;
  lng: number;
}): Promise<CurrentWeather | null> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${coord.lat}&longitude=${coord.lng}` +
      `&current_weather=true&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      current_weather?: { temperature: number; weathercode: number };
    };
    const cw = data.current_weather;
    if (!cw) return null;
    return { temperatureC: Math.round(cw.temperature), weatherCode: cw.weathercode };
  } catch {
    return null;
  }
}

// Nhóm mã WMO thành vài loại hình ảnh chính — đủ dùng cho 1 icon nhỏ, không
// cần phân biệt hết ~30 mã gốc.
export type WeatherKind = "clear" | "cloudy" | "fog" | "rain" | "storm";

export function weatherKindFromCode(code: number): WeatherKind {
  if (code === 0 || code === 1) return "clear";
  if (code === 2 || code === 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if (code >= 95) return "storm";
  return "rain"; // 51-67, 71-77, 80-86: mưa/mưa phùn/tuyết — hiếm gặp ở VN nên gộp chung mưa
}

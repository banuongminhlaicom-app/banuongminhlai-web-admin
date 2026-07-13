export function formatVND(value: number): string {
  const rounded = Math.round(value / 1000) * 1000;
  return new Intl.NumberFormat("vi-VN").format(rounded) + "đ";
}

export function formatKm(km: number): string {
  return `${km.toFixed(1).replace(".", ",")} km`;
}

export function formatMinutes(min: number): string {
  if (min < 60) return `${Math.round(min)} phút`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m ? `${h}h ${m}p` : `${h}h`;
}

export function greetingByHour(d = new Date()): string {
  const h = d.getHours();
  if (h < 11) return "Chào buổi sáng";
  if (h < 14) return "Chào buổi trưa";
  if (h < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}

export type TripStatus =
  "searching" | "accepted" | "arriving" | "arrived" | "in_progress" | "completed" | "cancelled";

export const TRIP_STATUS_LABEL: Record<TripStatus, string> = {
  searching: "Đang tìm tài xế",
  accepted: "Tài xế đã nhận",
  arriving: "Tài xế đang đến",
  arrived: "Tài xế đã đến",
  in_progress: "Đang di chuyển",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
};

export interface Driver {
  id: string;
  name: string;
  phone: string;
  rating: number;
  trips: number;
  yearsExperience: number;
  vehicleClass: string;
  online: boolean;
  avatar: string;
  etaMinutes: number;
}

export const MOCK_DRIVERS: Driver[] = [
  {
    id: "d1",
    name: "Trần Minh Tuấn",
    phone: "0912 ••• 456",
    rating: 4.9,
    trips: 328,
    yearsExperience: 8,
    vehicleClass: "B2",
    online: true,
    avatar: "TT",
    etaMinutes: 6,
  },
  {
    id: "d2",
    name: "Nguyễn Văn Hùng",
    phone: "0987 ••• 123",
    rating: 4.8,
    trips: 214,
    yearsExperience: 5,
    vehicleClass: "B2",
    online: true,
    avatar: "NH",
    etaMinutes: 9,
  },
  {
    id: "d3",
    name: "Lê Thanh Bình",
    phone: "0903 ••• 789",
    rating: 4.95,
    trips: 512,
    yearsExperience: 10,
    vehicleClass: "C",
    online: true,
    avatar: "LB",
    etaMinutes: 4,
  },
  {
    id: "d4",
    name: "Phạm Quốc Đạt",
    phone: "0968 ••• 222",
    rating: 4.7,
    trips: 156,
    yearsExperience: 3,
    vehicleClass: "B1",
    online: false,
    avatar: "PĐ",
    etaMinutes: 12,
  },
  {
    id: "d5",
    name: "Võ Hoàng Long",
    phone: "0977 ••• 555",
    rating: 4.85,
    trips: 289,
    yearsExperience: 6,
    vehicleClass: "B2",
    online: true,
    avatar: "VL",
    etaMinutes: 7,
  },
];

export interface Trip {
  id: string;
  code: string;
  customer: string;
  driver?: string;
  pickup: string;
  destination: string;
  distanceKm: number;
  durationMin: number;
  price: number;
  status: TripStatus;
  vehicleType: string;
  createdAt: string;
}

export const MOCK_TRIPS: Trip[] = [
  {
    id: "t1",
    code: "BUML-8821",
    customer: "Nguyễn Văn An",
    driver: "Trần Minh Tuấn",
    pickup: "Quán Bia Sài Gòn, Nguyễn Huệ",
    destination: "Phường Mỹ Phú, Cao Lãnh",
    distanceKm: 6.8,
    durationMin: 18,
    price: 127000,
    status: "in_progress",
    vehicleType: "Ô tô số tự động",
    createdAt: "2026-07-13T20:15:00",
  },
  {
    id: "t2",
    code: "BUML-8815",
    customer: "Trần Thị Bích",
    driver: "Lê Thanh Bình",
    pickup: "Nhà hàng Hoa Sen",
    destination: "KDC Mỹ Trà",
    distanceKm: 4.2,
    durationMin: 12,
    price: 100000,
    status: "completed",
    vehicleType: "Ô tô số sàn",
    createdAt: "2026-07-12T22:30:00",
  },
  {
    id: "t3",
    code: "BUML-8809",
    customer: "Lê Minh Khoa",
    driver: "Nguyễn Văn Hùng",
    pickup: "Karaoke Icool",
    destination: "Phường Hòa Thuận",
    distanceKm: 8.5,
    durationMin: 22,
    price: 178000,
    status: "completed",
    vehicleType: "Ô tô 7 chỗ",
    createdAt: "2026-07-11T23:45:00",
  },
  {
    id: "t4",
    code: "BUML-8802",
    customer: "Phạm Thanh Vy",
    driver: "Võ Hoàng Long",
    pickup: "Quảng trường Văn Miếu",
    destination: "Phường 4, Cao Lãnh",
    distanceKm: 3.1,
    durationMin: 10,
    price: 100000,
    status: "cancelled",
    vehicleType: "Xe máy",
    createdAt: "2026-07-10T21:20:00",
  },
  {
    id: "t5",
    code: "BUML-8798",
    customer: "Đỗ Quang Huy",
    driver: "Trần Minh Tuấn",
    pickup: "Beer Club 25",
    destination: "Xã Mỹ Tân",
    distanceKm: 12.4,
    durationMin: 28,
    price: 245000,
    status: "completed",
    vehicleType: "Ô tô số tự động",
    createdAt: "2026-07-09T23:10:00",
  },
  {
    id: "t6",
    code: "BUML-8790",
    customer: "Bùi Ngọc Hà",
    pickup: "Nhà hàng Sen Vàng",
    destination: "Phường 6, Cao Lãnh",
    distanceKm: 5.5,
    durationMin: 15,
    price: 115000,
    status: "searching",
    vehicleType: "Ô tô số tự động",
    createdAt: "2026-07-13T20:45:00",
  },
];

export const MOCK_CUSTOMERS = [
  { id: "c1", name: "Nguyễn Văn An", phone: "0901 234 567", trips: 14, joined: "03/2025" },
  { id: "c2", name: "Trần Thị Bích", phone: "0912 345 678", trips: 8, joined: "05/2025" },
  { id: "c3", name: "Lê Minh Khoa", phone: "0923 456 789", trips: 21, joined: "01/2025" },
  { id: "c4", name: "Phạm Thanh Vy", phone: "0934 567 890", trips: 3, joined: "06/2025" },
  { id: "c5", name: "Đỗ Quang Huy", phone: "0945 678 901", trips: 32, joined: "11/2024" },
];

export interface Promotion {
  id: string;
  code: string;
  title: string;
  description: string;
  discount: number;
  expiresAt: string;
  used?: boolean;
}

export const MOCK_PROMOTIONS: Promotion[] = [
  {
    id: "p1",
    code: "TAIXE30",
    title: "Giảm 30.000đ chuyến đầu",
    description: "Áp dụng cho khách hàng mới, tối thiểu 100.000đ",
    discount: 30000,
    expiresAt: "31/12/2026",
  },
  {
    id: "p2",
    code: "CUOITUAN",
    title: "Giảm 20% cuối tuần",
    description: "Áp dụng T7-CN, tối đa 50.000đ",
    discount: 50000,
    expiresAt: "30/09/2026",
  },
  {
    id: "p3",
    code: "DEMKHUYA",
    title: "Miễn phụ phí đêm",
    description: "Áp dụng chuyến sau 22:00",
    discount: 25000,
    expiresAt: "15/08/2026",
    used: true,
  },
];

export interface AppNotification {
  id: string;
  title: string;
  content: string;
  time: string;
  read?: boolean;
}

export const MOCK_NOTIFICATIONS: AppNotification[] = [
  {
    id: "n1",
    title: "Tài xế đã nhận chuyến",
    content: "Anh Trần Minh Tuấn sẽ tới đón bạn trong 6 phút.",
    time: "5 phút trước",
  },
  {
    id: "n2",
    title: "Ưu đãi mới",
    content: "Nhập mã CUOITUAN để giảm 20% chuyến cuối tuần này.",
    time: "2 giờ trước",
  },
  {
    id: "n3",
    title: "Chuyến đi hoàn thành",
    content: "Cảm ơn bạn đã sử dụng dịch vụ. Đừng quên đánh giá tài xế!",
    time: "Hôm qua",
    read: true,
  },
  {
    id: "n4",
    title: "Nạp ví thành công",
    content: "Bạn vừa nạp 200.000đ vào ví.",
    time: "2 ngày trước",
    read: true,
  },
  {
    id: "n5",
    title: "Cập nhật điều khoản",
    content: "Chúng tôi đã cập nhật chính sách bảo mật.",
    time: "1 tuần trước",
    read: true,
  },
];

export const VEHICLE_TYPES = [
  { id: "moto", label: "Xe máy", desc: "Đón nhanh, tiết kiệm", icon: "🏍️", multiplier: 0.8 },
  { id: "auto", label: "Ô tô số tự động", desc: "Phổ biến nhất", icon: "🚗", multiplier: 1 },
  {
    id: "manual",
    label: "Ô tô số sàn",
    desc: "Yêu cầu tài xế hạng B2+",
    icon: "🚙",
    multiplier: 1.1,
  },
  { id: "7seat", label: "Xe từ 7 chỗ", desc: "Nhóm bạn, gia đình", icon: "🚐", multiplier: 1.25 },
];

export const SAVED_ADDRESSES = [
  { id: "a1", label: "Nhà", address: "123 Lê Duẩn, Phường 1, Cao Lãnh", icon: "🏠" },
  { id: "a2", label: "Công ty", address: "45 Nguyễn Huệ, Phường 2, Cao Lãnh", icon: "🏢" },
  { id: "a3", label: "Quán quen", address: "Nhà hàng Sen Vàng, Nguyễn Thái Học", icon: "⭐" },
];

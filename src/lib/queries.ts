import { supabase } from "./supabase";
import type { PricingRule } from "./pricing";

// ---------------------------------------------------------------------------
// Trips (booking.tsx, booking.searching.tsx, booking.$id.tsx)
// ---------------------------------------------------------------------------
export type TripStatusDb =
  | "searching"
  | "accepted"
  | "arriving"
  | "arrived"
  | "in_progress"
  | "completed"
  | "cancelled";

export interface TripRow {
  id: string;
  code: string;
  customer_id: string;
  driver_id: string | null;
  pickup_address: string;
  dropoff_address: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  distance_km: number | null;
  duration_min: number | null;
  vehicle_type: string;
  payment_method: "cash" | "transfer" | "qr";
  price: number;
  promotion_id: string | null;
  note: string | null;
  status: TripStatusDb;
  customer_rating: number | null;
  customer_feedback: string | null;
  started_at: string | null;
  created_at: string;
}

function generateTripCode() {
  const n = Math.floor(1000 + Math.random() * 9000);
  return `BUML-${n}`;
}

export async function createTrip(input: {
  customerId: string;
  pickupAddress: string;
  dropoffAddress: string;
  pickupCoord?: { lat: number; lng: number } | null;
  dropoffCoord?: { lat: number; lng: number } | null;
  distanceKm: number;
  durationMin: number;
  vehicleType: string;
  paymentMethod: "cash" | "transfer" | "qr";
  price: number;
  promotionId?: string | null;
  note?: string | null;
}): Promise<TripRow> {
  if (!supabase) throw new Error("Supabase chưa được cấu hình.");
  const { data, error } = await supabase
    .from("trips")
    .insert({
      code: generateTripCode(),
      customer_id: input.customerId,
      pickup_address: input.pickupAddress,
      dropoff_address: input.dropoffAddress,
      pickup_lat: input.pickupCoord?.lat ?? null,
      pickup_lng: input.pickupCoord?.lng ?? null,
      dropoff_lat: input.dropoffCoord?.lat ?? null,
      dropoff_lng: input.dropoffCoord?.lng ?? null,
      distance_km: input.distanceKm,
      duration_min: input.durationMin,
      vehicle_type: input.vehicleType,
      payment_method: input.paymentMethod,
      price: input.price,
      promotion_id: input.promotionId ?? null,
      note: input.note ?? null,
      status: "searching",
    })
    .select(
      "id, code, customer_id, driver_id, pickup_address, dropoff_address, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, distance_km, duration_min, vehicle_type, payment_method, price, promotion_id, note, status, customer_rating, customer_feedback, started_at, created_at",
    )
    .single();
  if (error) throw error;
  return data;
}

export async function getTrip(id: string): Promise<TripRow | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("trips")
    .select(
      "id, code, customer_id, driver_id, pickup_address, dropoff_address, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, distance_km, duration_min, vehicle_type, payment_method, price, promotion_id, note, status, customer_rating, customer_feedback, started_at, created_at",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateTripStatus(id: string, status: TripStatusDb): Promise<void> {
  if (!supabase) throw new Error("Supabase chưa được cấu hình.");
  const patch: Record<string, unknown> = { status };
  if (status === "in_progress") patch.started_at = new Date().toISOString();
  if (status === "completed") patch.completed_at = new Date().toISOString();
  if (status === "cancelled") patch.cancelled_at = new Date().toISOString();
  const { error } = await supabase.from("trips").update(patch).eq("id", id);
  if (error) throw error;
}

export async function cancelTrip(id: string): Promise<void> {
  return updateTripStatus(id, "cancelled");
}

export interface CustomerProfileLite {
  full_name: string | null;
  phone: string | null;
}

export async function getCustomerProfileForTrip(
  customerId: string,
): Promise<CustomerProfileLite | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("id", customerId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export interface AssignedDriverInfo {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  rating: number;
  trips_count: number;
  years_experience: number;
  vehicle_class: string | null;
  license_class: string | null;
}

// Thông tin hiện cho KHÁCH xem về tài xế đang phục vụ chuyến — cố ý KHÔNG lấy
// id_number/id_photo_path/license_photo_path (giấy tờ tuỳ thân riêng tư của
// tài xế, chỉ tài xế + admin xem được, xem getDriverKyc).
export async function getAssignedDriverInfo(driverId: string): Promise<AssignedDriverInfo | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, full_name, phone, avatar_url, drivers!inner(rating, trips_count, years_experience, vehicle_class, license_class)",
    )
    .eq("id", driverId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const d = Array.isArray(data.drivers) ? data.drivers[0] : data.drivers;
  return {
    id: data.id,
    full_name: data.full_name,
    phone: data.phone,
    avatar_url: data.avatar_url,
    rating: d?.rating ?? 5,
    trips_count: d?.trips_count ?? 0,
    years_experience: d?.years_experience ?? 0,
    vehicle_class: d?.vehicle_class ?? null,
    license_class: d?.license_class ?? null,
  };
}

export async function rateTrip(id: string, rating: number, feedback: string): Promise<void> {
  if (!supabase) throw new Error("Supabase chưa được cấu hình.");
  const { error } = await supabase
    .from("trips")
    .update({ customer_rating: rating, customer_feedback: feedback || null })
    .eq("id", id);
  if (error) throw error;
}

// Tài xế đánh giá khách sau khi hoàn thành chuyến — chiều ngược lại của
// rateTrip(). profiles.rating của khách tự tính lại qua trigger DB (stage16).
export async function rateCustomer(id: string, rating: number, feedback: string): Promise<void> {
  if (!supabase) throw new Error("Supabase chưa được cấu hình.");
  const { error } = await supabase
    .from("trips")
    .update({ driver_rating: rating, driver_feedback: feedback || null })
    .eq("id", id);
  if (error) throw error;
}

// Chuyến đang hoạt động của khách (chưa hoàn thành/huỷ) — để hiện lại trên
// trang chủ, tránh mất dấu chuyến khi khách bấm về Home giữa chừng.
// Dùng chung ACTIVE_TRIP_STATUSES định nghĩa bên dưới (admin dashboard).
export async function getActiveCustomerTrip(customerId: string): Promise<TripRow | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("trips")
    .select(
      "id, code, customer_id, driver_id, pickup_address, dropoff_address, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, distance_km, duration_min, vehicle_type, payment_method, price, promotion_id, note, status, customer_rating, customer_feedback, started_at, created_at",
    )
    .eq("customer_id", customerId)
    .in("status", ACTIVE_TRIP_STATUSES)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Chuyến gần nhất ĐÃ HOÀN THÀNH của khách — dùng cho khối "Cuốc xe gần nhất"
// trên Home để đặt lại nhanh cùng tuyến (khác với getActiveCustomerTrip ở
// trên, vốn chỉ trả chuyến đang diễn ra).
export async function getMostRecentCompletedTrip(customerId: string): Promise<TripRow | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("trips")
    .select(
      "id, code, customer_id, driver_id, pickup_address, dropoff_address, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, distance_km, duration_min, vehicle_type, payment_method, price, promotion_id, note, status, customer_rating, customer_feedback, started_at, created_at",
    )
    .eq("customer_id", customerId)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Toàn bộ lịch sử chuyến của khách (mọi trạng thái) — dùng cho trips.tsx, lọc
// theo tab ở phía client. Khác getActiveCustomerTrip/getMostRecentCompletedTrip
// ở trên vốn chỉ trả về 1 chuyến.
export async function getTrips(customerId: string): Promise<TripRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("trips")
    .select(
      "id, code, customer_id, driver_id, pickup_address, dropoff_address, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, distance_km, duration_min, vehicle_type, payment_method, price, promotion_id, note, status, customer_rating, customer_feedback, started_at, created_at",
    )
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// Toàn bộ chuyến trong hệ thống (mọi khách) — dùng cho admin.bookings.tsx.
// Giới hạn 200 chuyến mới nhất để tránh tải cả bảng khi dữ liệu lớn dần; lấy
// tên khách/tài xế qua bảng profiles riêng (không dùng embed join) giống hệt
// cách getAdminDashboardStats().recentTrips đã làm.
export async function getAllTripsAdmin(): Promise<
  (TripRow & { customer_name: string | null; driver_name: string | null })[]
> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("trips")
    .select(
      "id, code, customer_id, driver_id, pickup_address, dropoff_address, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, distance_km, duration_min, vehicle_type, payment_method, price, promotion_id, note, status, customer_rating, customer_feedback, started_at, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  const trips = data ?? [];

  const ids = Array.from(
    new Set(trips.flatMap((t) => [t.customer_id, t.driver_id]).filter((id): id is string => !!id)),
  );
  const namesById = new Map<string, string | null>();
  if (ids.length) {
    const { data: nameRows } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", ids);
    for (const row of nameRows ?? []) namesById.set(row.id, row.full_name);
  }
  return trips.map((t) => ({
    ...t,
    customer_name: namesById.get(t.customer_id) ?? null,
    driver_name: t.driver_id ? (namesById.get(t.driver_id) ?? null) : null,
  }));
}

export function subscribeTripStatus(id: string, onUpdate: (trip: TripRow) => void): () => void {
  if (!supabase) return () => {};
  const client = supabase;
  const channel = client
    .channel(`trip-${id}`)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "trips", filter: `id=eq.${id}` },
      (payload) => onUpdate(payload.new as TripRow),
    )
    .subscribe();
  return () => {
    client.removeChannel(channel);
  };
}

// ---------------------------------------------------------------------------
// Chat trong chuyến (Giai đoạn 8) — khách ↔ tài xế
// ---------------------------------------------------------------------------
export interface TripMessageRow {
  id: string;
  trip_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export async function getTripMessages(tripId: string): Promise<TripMessageRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("trip_messages")
    .select("id, trip_id, sender_id, content, created_at")
    .eq("trip_id", tripId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function sendTripMessage(
  tripId: string,
  senderId: string,
  content: string,
): Promise<void> {
  if (!supabase) throw new Error("Supabase chưa được cấu hình.");
  const text = content.trim();
  if (!text) return;
  const { error } = await supabase
    .from("trip_messages")
    .insert({ trip_id: tripId, sender_id: senderId, content: text });
  if (error) throw error;
}

export function subscribeTripMessages(
  tripId: string,
  onInsert: (row: TripMessageRow) => void,
): () => void {
  if (!supabase) return () => {};
  const client = supabase;
  const channel = client
    .channel(`trip-messages-${tripId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "trip_messages",
        filter: `trip_id=eq.${tripId}`,
      },
      (payload) => onInsert(payload.new as TripMessageRow),
    )
    .subscribe();
  return () => {
    client.removeChannel(channel);
  };
}

// ---------------------------------------------------------------------------
// Drivers (admin.drivers.tsx)
// ---------------------------------------------------------------------------
export interface DriverRow {
  id: string;
  full_name: string | null;
  phone: string | null;
  rating: number;
  trips_count: number;
  years_experience: number;
  vehicle_class: string | null;
  online: boolean;
  approved: boolean;
}

export async function getDrivers(): Promise<DriverRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, full_name, phone, drivers!inner(rating, trips_count, years_experience, vehicle_class, online, approved)",
    )
    .eq("role", "driver");
  if (error) throw error;
  return (data ?? []).map((row) => {
    const d = Array.isArray(row.drivers) ? row.drivers[0] : row.drivers;
    return {
      id: row.id,
      full_name: row.full_name,
      phone: row.phone,
      rating: d?.rating ?? 0,
      trips_count: d?.trips_count ?? 0,
      years_experience: d?.years_experience ?? 0,
      vehicle_class: d?.vehicle_class ?? null,
      online: d?.online ?? false,
      approved: d?.approved ?? false,
    };
  });
}

export async function approveDriver(driverId: string, approved: boolean) {
  if (!supabase) throw new Error("Supabase chưa được cấu hình.");
  const { error } = await supabase.from("drivers").update({ approved }).eq("id", driverId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Bản đồ trực tiếp (admin.live.tsx) — tài xế đang online (GPS thật, cập nhật
// qua drivers.current_lat/lng — realtime đã bật từ Giai đoạn 4) + chuyến đang
// diễn ra (điểm đón/đến tĩnh, khách không gửi GPS nên không có vị trí sống
// động cho khách — chỉ tài xế mới có).
// ---------------------------------------------------------------------------
export interface LiveDriverRow {
  id: string;
  full_name: string | null;
  phone: string | null;
  status: string;
  current_lat: number | null;
  current_lng: number | null;
  rating: number;
  today_trips: number;
}

export async function getOnlineDrivers(): Promise<LiveDriverRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, full_name, phone, drivers!inner(status, current_lat, current_lng, rating, today_trips, online)",
    )
    .eq("role", "driver")
    .eq("drivers.online", true);
  if (error) throw error;
  return (data ?? []).map((row) => {
    const d = Array.isArray(row.drivers) ? row.drivers[0] : row.drivers;
    return {
      id: row.id,
      full_name: row.full_name,
      phone: row.phone,
      status: d?.status ?? "online",
      current_lat: d?.current_lat ?? null,
      current_lng: d?.current_lng ?? null,
      rating: d?.rating ?? 5,
      today_trips: d?.today_trips ?? 0,
    };
  });
}

export interface LiveTripRow {
  id: string;
  code: string;
  status: string;
  pickup_address: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  dropoff_address: string;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  customer_id: string;
  driver_id: string | null;
  customer_name: string | null;
  driver_name: string | null;
}

export async function getActiveTrips(): Promise<LiveTripRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("trips")
    .select(
      "id, code, status, pickup_address, pickup_lat, pickup_lng, dropoff_address, dropoff_lat, dropoff_lng, customer_id, driver_id",
    )
    .in("status", ACTIVE_TRIP_STATUSES);
  if (error) throw error;
  const trips = data ?? [];

  const ids = Array.from(
    new Set(trips.flatMap((t) => [t.customer_id, t.driver_id]).filter((id): id is string => !!id)),
  );
  const namesById = new Map<string, string | null>();
  if (ids.length) {
    const { data: nameRows } = await supabase.from("profiles").select("id, full_name").in("id", ids);
    for (const row of nameRows ?? []) namesById.set(row.id, row.full_name);
  }

  return trips.map((t) => ({
    ...t,
    customer_name: namesById.get(t.customer_id) ?? null,
    driver_name: t.driver_id ? (namesById.get(t.driver_id) ?? null) : null,
  }));
}

// Hồ sơ đầy đủ hơn DriverRow (list) — dùng cho màn admin.drivers.$id.tsx.
export interface DriverAdminDetail extends DriverRow {
  status: string;
  auto_accept: boolean;
  today_trips: number;
  today_revenue: number;
}

export async function getDriverAdminDetail(driverId: string): Promise<DriverAdminDetail | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, full_name, phone, drivers!inner(rating, trips_count, years_experience, vehicle_class, online, approved, status, auto_accept, today_trips, today_revenue)",
    )
    .eq("id", driverId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const d = Array.isArray(data.drivers) ? data.drivers[0] : data.drivers;
  return {
    id: data.id,
    full_name: data.full_name,
    phone: data.phone,
    rating: d?.rating ?? 0,
    trips_count: d?.trips_count ?? 0,
    years_experience: d?.years_experience ?? 0,
    vehicle_class: d?.vehicle_class ?? null,
    online: d?.online ?? false,
    approved: d?.approved ?? false,
    status: d?.status ?? "offline",
    auto_accept: d?.auto_accept ?? false,
    today_trips: d?.today_trips ?? 0,
    today_revenue: d?.today_revenue ?? 0,
  };
}

// Lịch sử chuyến của 1 tài xế — dùng ở admin.drivers.$id.tsx.
export async function getTripsByDriver(driverId: string, limit = 20): Promise<TripRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("trips")
    .select(
      "id, code, customer_id, driver_id, pickup_address, dropoff_address, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, distance_km, duration_min, vehicle_type, payment_method, price, promotion_id, note, status, customer_rating, customer_feedback, started_at, created_at",
    )
    .eq("driver_id", driverId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

// Lịch sử chuyến của 1 khách hàng — dùng ở admin.customers.$id.tsx.
export async function getTripsByCustomer(customerId: string, limit = 20): Promise<TripRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("trips")
    .select(
      "id, code, customer_id, driver_id, pickup_address, dropoff_address, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, distance_km, duration_min, vehicle_type, payment_method, price, promotion_id, note, status, customer_rating, customer_feedback, started_at, created_at",
    )
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

// ---------------------------------------------------------------------------
// Customers (admin.customers.tsx)
// ---------------------------------------------------------------------------
export interface CustomerRow {
  id: string;
  full_name: string | null;
  phone: string | null;
  created_at: string;
}

export async function getCustomers(): Promise<CustomerRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, phone, created_at")
    .eq("role", "customer")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// Hồ sơ đầy đủ hơn CustomerRow — dùng cho màn admin.customers.$id.tsx.
export interface CustomerDetail extends CustomerRow {
  avatar_url: string | null;
  rating: number;
  trips_count: number;
  points: number;
}

export async function getCustomerDetail(customerId: string): Promise<CustomerDetail | null> {
  if (!supabase) return null;
  const [profileRes, tripsRes, pointsRow] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, phone, avatar_url, rating, created_at")
      .eq("id", customerId)
      .maybeSingle(),
    supabase
      .from("trips")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", customerId)
      .eq("status", "completed"),
    getLoyaltyPoints(customerId),
  ]);
  if (profileRes.error) throw profileRes.error;
  if (!profileRes.data) return null;
  if (tripsRes.error) throw tripsRes.error;

  return {
    id: profileRes.data.id,
    full_name: profileRes.data.full_name,
    phone: profileRes.data.phone,
    avatar_url: profileRes.data.avatar_url,
    rating: profileRes.data.rating ?? 5,
    created_at: profileRes.data.created_at,
    trips_count: tripsRes.count ?? 0,
    points: pointsRow?.balance ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Hồ sơ người dùng (profile.tsx, driver.profile.tsx) — sửa tên/avatar dùng
// chung cho cả khách hàng và tài xế.
// ---------------------------------------------------------------------------
export async function updateMyProfile(
  userId: string,
  patch: { full_name?: string; avatar_url?: string },
): Promise<void> {
  if (!supabase) throw new Error("Supabase chưa được cấu hình.");
  const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
  if (error) throw error;
}

// Upload ảnh đại diện vào bucket public "avatars" (stage17), path bắt buộc
// theo <user_id>/... để khớp RLS chủ sở hữu, rồi ghi thẳng vào profiles.avatar_url.
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  if (!supabase) throw new Error("Supabase chưa được cấu hình.");
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true });
  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(path);

  await updateMyProfile(userId, { avatar_url: publicUrl });
  return publicUrl;
}

export interface CustomerStatsRow {
  tripsCount: number;
  rating: number;
  points: number;
  promotionsUsed: number;
}

// Thống kê thật cho profile.tsx — trước đây "14 chuyến", "4.9", "230 điểm",
// "3 ưu đãi" đều là số hardcode.
export async function getCustomerStats(customerId: string): Promise<CustomerStatsRow> {
  if (!supabase) return { tripsCount: 0, rating: 5, points: 0, promotionsUsed: 0 };
  const client = supabase;
  const [tripsRes, profileRes, pointsRow, promotionsRes] = await Promise.all([
    client
      .from("trips")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", customerId)
      .eq("status", "completed"),
    client.from("profiles").select("rating").eq("id", customerId).maybeSingle(),
    getLoyaltyPoints(customerId),
    client
      .from("promotion_redemptions")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", customerId),
  ]);
  if (tripsRes.error) throw tripsRes.error;
  if (profileRes.error) throw profileRes.error;
  if (promotionsRes.error) throw promotionsRes.error;
  return {
    tripsCount: tripsRes.count ?? 0,
    rating: profileRes.data?.rating ?? 5,
    points: pointsRow?.balance ?? 0,
    promotionsUsed: promotionsRes.count ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Promotions (admin.promotions.tsx, promotions.tsx, booking.tsx)
// ---------------------------------------------------------------------------
export type DiscountType = "fixed" | "percent";

export interface PromotionRow {
  id: string;
  code: string;
  title: string;
  description: string | null;
  discount: number;
  discount_type: DiscountType;
  expires_at: string | null;
  active: boolean;
  image_url: string | null;
}

const PROMOTION_COLUMNS =
  "id, code, title, description, discount, discount_type, expires_at, active, image_url";

export async function getPromotions(): Promise<PromotionRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("promotions")
    .select(PROMOTION_COLUMNS)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function findActivePromotionByCode(code: string): Promise<PromotionRow | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("promotions")
    .select(PROMOTION_COLUMNS)
    .eq("code", code.trim().toUpperCase())
    .eq("active", true)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null;
  return data;
}

// Upload ảnh banner cho 1 mã khuyến mãi (admin.promotions.tsx) — lưu ở bucket
// public "promotion-banners" rồi ghi URL công khai vào cột image_url. Xoá ảnh
// cũ (nếu có) trước khi ghi đè, tránh rác tích luỹ trong bucket qua nhiều lần đổi ảnh.
export async function uploadPromotionBanner(promotionId: string, file: File): Promise<string> {
  if (!supabase) throw new Error("Supabase chưa được cấu hình.");
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${promotionId}/${Date.now()}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("promotion-banners")
    .upload(path, file, { upsert: true });
  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = supabase.storage.from("promotion-banners").getPublicUrl(path);

  const { error: updateError } = await supabase
    .from("promotions")
    .update({ image_url: publicUrl })
    .eq("id", promotionId);
  if (updateError) throw updateError;

  return publicUrl;
}

export async function removePromotionBanner(promotionId: string): Promise<void> {
  if (!supabase) throw new Error("Supabase chưa được cấu hình.");
  const { error } = await supabase
    .from("promotions")
    .update({ image_url: null })
    .eq("id", promotionId);
  if (error) throw error;
}

export interface PromotionInput {
  code: string;
  title: string;
  description: string | null;
  discount: number;
  discountType: DiscountType;
  expiresAt: string | null; // yyyy-mm-dd, rỗng = không giới hạn
}

export async function createPromotion(input: PromotionInput): Promise<PromotionRow> {
  if (!supabase) throw new Error("Supabase chưa được cấu hình.");
  const { data, error } = await supabase
    .from("promotions")
    .insert({
      code: input.code.trim().toUpperCase(),
      title: input.title.trim(),
      description: input.description?.trim() || null,
      discount: input.discount,
      discount_type: input.discountType,
      expires_at: input.expiresAt || null,
    })
    .select(PROMOTION_COLUMNS)
    .single();
  if (error) throw error;
  return data;
}

export async function updatePromotion(id: string, input: PromotionInput): Promise<void> {
  if (!supabase) throw new Error("Supabase chưa được cấu hình.");
  const { error } = await supabase
    .from("promotions")
    .update({
      code: input.code.trim().toUpperCase(),
      title: input.title.trim(),
      description: input.description?.trim() || null,
      discount: input.discount,
      discount_type: input.discountType,
      expires_at: input.expiresAt || null,
    })
    .eq("id", id);
  if (error) throw error;
}

// Xoá hẳn mã khuyến mãi. Lượt đã dùng mã này (promotion_redemptions) tự dọn
// theo vì FK khai báo "on delete cascade" — không cần dọn tay ở đây.
export async function deletePromotion(id: string): Promise<void> {
  if (!supabase) throw new Error("Supabase chưa được cấu hình.");
  const { error } = await supabase.from("promotions").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Partner venues (home.tsx, admin.venues.tsx) — quán nhậu/nhà hàng đối tác trả
// phí quảng cáo, KHÔNG phải quét tự động theo GPS (đã bỏ vì Goong thiếu
// ảnh/rating/giờ mở cửa thật).
// ---------------------------------------------------------------------------
export interface PartnerVenueRow {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  image_url: string | null;
  active: boolean;
  sort_order: number;
}

const PARTNER_VENUE_COLUMNS = "id, name, address, lat, lng, image_url, active, sort_order";

// sort_order càng cao thì hiện càng trước — admin tự sắp xếp qua nút lên/xuống
// trong admin.venues.tsx, thay vì luôn cố định theo ngày tạo.
const PARTNER_VENUE_ORDER = [
  { column: "sort_order", options: { ascending: false } },
  { column: "created_at", options: { ascending: false } },
] as const;

// Home chỉ hiện venue đang active — dùng bởi khách.
export async function getPartnerVenues(): Promise<PartnerVenueRow[]> {
  if (!supabase) return [];
  let query = supabase.from("partner_venues").select(PARTNER_VENUE_COLUMNS).eq("active", true);
  for (const { column, options } of PARTNER_VENUE_ORDER) query = query.order(column, options);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

// Admin thấy cả venue đang tắt để còn bật lại được.
export async function getPartnerVenuesAdmin(): Promise<PartnerVenueRow[]> {
  if (!supabase) return [];
  let query = supabase.from("partner_venues").select(PARTNER_VENUE_COLUMNS);
  for (const { column, options } of PARTNER_VENUE_ORDER) query = query.order(column, options);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

// Đổi chỗ thứ tự 2 địa điểm cạnh nhau (nút lên/xuống trong admin) — hoán đổi
// sort_order của 2 dòng thay vì đánh số lại toàn bộ danh sách.
export async function swapPartnerVenueOrder(
  aId: string,
  aOrder: number,
  bId: string,
  bOrder: number,
): Promise<void> {
  if (!supabase) throw new Error("Supabase chưa được cấu hình.");
  const { error: e1 } = await supabase
    .from("partner_venues")
    .update({ sort_order: bOrder })
    .eq("id", aId);
  if (e1) throw e1;
  const { error: e2 } = await supabase
    .from("partner_venues")
    .update({ sort_order: aOrder })
    .eq("id", bId);
  if (e2) throw e2;
}

export interface PartnerVenueInput {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

export async function createPartnerVenue(input: PartnerVenueInput): Promise<PartnerVenueRow> {
  if (!supabase) throw new Error("Supabase chưa được cấu hình.");
  const { data, error } = await supabase
    .from("partner_venues")
    .insert({
      name: input.name.trim(),
      address: input.address.trim(),
      lat: input.lat,
      lng: input.lng,
    })
    .select(PARTNER_VENUE_COLUMNS)
    .single();
  if (error) throw error;
  return data;
}

export async function updatePartnerVenue(id: string, input: PartnerVenueInput): Promise<void> {
  if (!supabase) throw new Error("Supabase chưa được cấu hình.");
  const { error } = await supabase
    .from("partner_venues")
    .update({
      name: input.name.trim(),
      address: input.address.trim(),
      lat: input.lat,
      lng: input.lng,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function togglePartnerVenueActive(id: string, active: boolean): Promise<void> {
  if (!supabase) throw new Error("Supabase chưa được cấu hình.");
  const { error } = await supabase.from("partner_venues").update({ active }).eq("id", id);
  if (error) throw error;
}

export async function deletePartnerVenue(id: string): Promise<void> {
  if (!supabase) throw new Error("Supabase chưa được cấu hình.");
  const { error } = await supabase.from("partner_venues").delete().eq("id", id);
  if (error) throw error;
}

export async function uploadPartnerVenueImage(venueId: string, file: File): Promise<string> {
  if (!supabase) throw new Error("Supabase chưa được cấu hình.");
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${venueId}/${Date.now()}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("partner-venues")
    .upload(path, file, { upsert: true });
  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = supabase.storage.from("partner-venues").getPublicUrl(path);

  const { error: updateError } = await supabase
    .from("partner_venues")
    .update({ image_url: publicUrl })
    .eq("id", venueId);
  if (updateError) throw updateError;

  return publicUrl;
}

export async function removePartnerVenueImage(venueId: string): Promise<void> {
  if (!supabase) throw new Error("Supabase chưa được cấu hình.");
  const { error } = await supabase
    .from("partner_venues")
    .update({ image_url: null })
    .eq("id", venueId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Addresses (home.tsx, booking.tsx, addresses.tsx)
// ---------------------------------------------------------------------------
export interface AddressRow {
  id: string;
  label: string;
  address: string;
  icon: string | null;
}

export async function getAddresses(userId: string): Promise<AddressRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("addresses")
    .select("id, label, address, icon")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function addAddress(
  userId: string,
  input: { label: string; address: string; icon?: string },
): Promise<void> {
  if (!supabase) throw new Error("Supabase chưa được cấu hình.");
  const { error } = await supabase.from("addresses").insert({ owner_id: userId, ...input });
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Vehicle types (booking.tsx)
// ---------------------------------------------------------------------------
export interface VehicleTypeRow {
  id: string;
  label: string;
  description: string | null;
  icon: string | null;
  multiplier: number;
}

export async function getVehicleTypes(): Promise<VehicleTypeRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("vehicle_types")
    .select("id, label, description, icon, multiplier")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

// ---------------------------------------------------------------------------
// Driver self + dispatch (driver.index.tsx, driver.trips.$id.tsx, driver.earnings.tsx)
// ---------------------------------------------------------------------------
export type DriverStatusDb =
  | "offline"
  | "online"
  | "assigned"
  | "going_to_pickup"
  | "arrived"
  | "met_customer"
  | "in_progress"
  | "completed";

export interface DriverSelfRow {
  id: string;
  online: boolean;
  auto_accept: boolean;
  status: DriverStatusDb;
  online_since: string | null;
  today_trips: number;
  today_revenue: number;
  current_trip_id: string | null;
  rating: number;
}

const DRIVER_SELF_COLUMNS =
  "id, online, auto_accept, status, online_since, today_trips, today_revenue, current_trip_id, rating";

export async function getDriverSelf(id: string): Promise<DriverSelfRow | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("drivers")
    .select(DRIVER_SELF_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function setDriverOnline(id: string, online: boolean): Promise<void> {
  if (!supabase) throw new Error("Supabase chưa được cấu hình.");
  const patch = online
    ? { online: true, status: "online" as const, online_since: new Date().toISOString() }
    : { online: false, status: "offline" as const, online_since: null };
  const { error } = await supabase.from("drivers").update(patch).eq("id", id);
  if (error) throw error;
}

export async function setAutoAccept(id: string, autoAccept: boolean): Promise<void> {
  if (!supabase) throw new Error("Supabase chưa được cấu hình.");
  const { error } = await supabase.from("drivers").update({ auto_accept: autoAccept }).eq("id", id);
  if (error) throw error;
}

export async function setDriverStatus(id: string, status: DriverStatusDb): Promise<void> {
  if (!supabase) throw new Error("Supabase chưa được cấu hình.");
  const { error } = await supabase.from("drivers").update({ status }).eq("id", id);
  if (error) throw error;
}

export function subscribeDriverSelf(
  id: string,
  onUpdate: (row: DriverSelfRow) => void,
): () => void {
  if (!supabase) return () => {};
  const client = supabase;
  const channel = client
    .channel(`driver-${id}`)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "drivers", filter: `id=eq.${id}` },
      (payload) => onUpdate(payload.new as DriverSelfRow),
    )
    .subscribe();
  return () => {
    client.removeChannel(channel);
  };
}

// Tài xế đồng ý nhận chuyến vừa được hệ thống tự gán.
export async function acceptAssignedTrip(tripId: string, driverId: string): Promise<void> {
  if (!supabase) throw new Error("Supabase chưa được cấu hình.");
  const { error: tripErr } = await supabase
    .from("trips")
    .update({ status: "accepted" })
    .eq("id", tripId)
    .eq("driver_id", driverId);
  if (tripErr) throw tripErr;
  const { error: driverErr } = await supabase
    .from("drivers")
    .update({ status: "going_to_pickup" })
    .eq("id", driverId);
  if (driverErr) throw driverErr;
}

// Tài xế từ chối / hết giờ không phản hồi -> nhả chuyến, thử tìm tài xế khác ngay.
export async function rejectAssignedTrip(tripId: string, driverId: string): Promise<void> {
  if (!supabase) throw new Error("Supabase chưa được cấu hình.");
  const { error: tripErr } = await supabase
    .from("trips")
    .update({ driver_id: null })
    .eq("id", tripId)
    .eq("driver_id", driverId);
  if (tripErr) throw tripErr;
  const { error: driverErr } = await supabase
    .from("drivers")
    .update({ current_trip_id: null, status: "online" })
    .eq("id", driverId);
  if (driverErr) throw driverErr;
  await supabase.rpc("try_assign_driver_to_trip", { p_trip_id: tripId });
}

// Tài xế báo đã tới điểm đón: cập nhật cả trip (khách thấy) lẫn driver.
export async function markDriverArrived(tripId: string, driverId: string): Promise<void> {
  if (!supabase) throw new Error("Supabase chưa được cấu hình.");
  const { error: tripErr } = await supabase
    .from("trips")
    .update({ status: "arrived" })
    .eq("id", tripId)
    .eq("driver_id", driverId);
  if (tripErr) throw tripErr;
  const { error: driverErr } = await supabase
    .from("drivers")
    .update({ status: "arrived" })
    .eq("id", driverId);
  if (driverErr) throw driverErr;
}

export async function completeDriverTrip(
  driverId: string,
  tripId: string,
  patch: { todayTrips: number; todayRevenue: number },
): Promise<void> {
  if (!supabase) throw new Error("Supabase chưa được cấu hình.");
  const { error: tripErr } = await supabase
    .from("trips")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", tripId)
    .eq("driver_id", driverId);
  if (tripErr) throw tripErr;
  const { error: driverErr } = await supabase
    .from("drivers")
    .update({
      current_trip_id: null,
      status: "online",
      today_trips: patch.todayTrips,
      today_revenue: patch.todayRevenue,
    })
    .eq("id", driverId);
  if (driverErr) throw driverErr;
}

// ---------------------------------------------------------------------------
// Hồ sơ giấy tờ tài xế (driver.profile.tsx) — trước đây toàn dữ liệu giả
// hardcode. id_photo_path/license_photo_path lưu path trong bucket private
// "driver-docs" (stage18), không phải URL công khai — phải đổi thành signed
// URL mỗi lần hiển thị vì ảnh giấy tờ tuỳ thân nhạy cảm.
// ---------------------------------------------------------------------------
export interface DriverKycRow {
  years_experience: number;
  vehicle_class: string | null;
  id_number: string | null;
  id_photo_path: string | null;
  id_photo_url: string | null;
  id_photo_back_path: string | null;
  id_photo_back_url: string | null;
  license_class: string | null;
  license_expiry: string | null;
  license_photo_path: string | null;
  license_photo_url: string | null;
  license_photo_back_path: string | null;
  license_photo_back_url: string | null;
  selfie_path: string | null;
  selfie_url: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  // 2 giấy tờ do ADMIN tự bổ sung (không phải tài xế nộp) — stage21.
  conduct_cert_path: string | null;
  conduct_cert_url: string | null;
  background_check_path: string | null;
  background_check_url: string | null;
}

const DRIVER_KYC_COLUMNS =
  "years_experience, vehicle_class, id_number, id_photo_path, id_photo_back_path, license_class, license_expiry, license_photo_path, license_photo_back_path, selfie_path, emergency_contact_name, emergency_contact_phone, conduct_cert_path, background_check_path";

async function signDriverDocPath(path: string | null): Promise<string | null> {
  if (!supabase || !path) return null;
  const { data } = await supabase.storage.from("driver-docs").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

export async function getDriverKyc(driverId: string): Promise<DriverKycRow | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("drivers")
    .select(DRIVER_KYC_COLUMNS)
    .eq("id", driverId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const [
    id_photo_url,
    id_photo_back_url,
    license_photo_url,
    license_photo_back_url,
    selfie_url,
    conduct_cert_url,
    background_check_url,
  ] = await Promise.all([
    signDriverDocPath(data.id_photo_path),
    signDriverDocPath(data.id_photo_back_path),
    signDriverDocPath(data.license_photo_path),
    signDriverDocPath(data.license_photo_back_path),
    signDriverDocPath(data.selfie_path),
    signDriverDocPath(data.conduct_cert_path),
    signDriverDocPath(data.background_check_path),
  ]);

  return {
    years_experience: data.years_experience,
    vehicle_class: data.vehicle_class,
    id_number: data.id_number,
    id_photo_path: data.id_photo_path,
    id_photo_url,
    id_photo_back_path: data.id_photo_back_path,
    id_photo_back_url,
    license_class: data.license_class,
    license_expiry: data.license_expiry,
    license_photo_path: data.license_photo_path,
    license_photo_url,
    license_photo_back_path: data.license_photo_back_path,
    license_photo_back_url,
    selfie_path: data.selfie_path,
    selfie_url,
    emergency_contact_name: data.emergency_contact_name,
    emergency_contact_phone: data.emergency_contact_phone,
    conduct_cert_path: data.conduct_cert_path,
    conduct_cert_url,
    background_check_path: data.background_check_path,
    background_check_url,
  };
}

export async function updateDriverKyc(
  driverId: string,
  patch: Partial<{
    years_experience: number;
    vehicle_class: string;
    id_number: string;
    license_class: string;
    license_expiry: string;
    emergency_contact_name: string;
    emergency_contact_phone: string;
  }>,
): Promise<void> {
  if (!supabase) throw new Error("Supabase chưa được cấu hình.");
  const { error } = await supabase.from("drivers").update(patch).eq("id", driverId);
  if (error) throw error;
}

// Upload ảnh CCCD/GPLX (mặt trước/sau) + selfie vào bucket private
// "driver-docs", ghi path (không phải URL) vào cột tương ứng của drivers, trả
// về 1 signed URL để hiển thị ngay không cần chờ query lại.
const DRIVER_DOC_COLUMN = {
  id_front: "id_photo_path",
  id_back: "id_photo_back_path",
  license_front: "license_photo_path",
  license_back: "license_photo_back_path",
  selfie: "selfie_path",
  // 2 loại này do ADMIN tải lên (không phải tài xế), xem uploadDriverDoc.
  conduct_cert: "conduct_cert_path",
  background_check: "background_check_path",
} as const;

export type DriverDocKind = keyof typeof DRIVER_DOC_COLUMN;

export async function uploadDriverDoc(
  driverId: string,
  kind: DriverDocKind,
  file: File,
): Promise<string | null> {
  if (!supabase) throw new Error("Supabase chưa được cấu hình.");
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${driverId}/${kind}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("driver-docs")
    .upload(path, file, { upsert: true });
  if (uploadError) throw uploadError;

  const column = DRIVER_DOC_COLUMN[kind];
  const { error: updateError } = await supabase
    .from("drivers")
    .update({ [column]: path })
    .eq("id", driverId);
  if (updateError) throw updateError;

  return signDriverDocPath(path);
}

// Xoá 1 ảnh giấy tờ đã tải (driver tự xoá của mình, hoặc admin xoá giấy tờ đã
// bổ sung) — xoá file khỏi storage rồi clear cột path tương ứng.
export async function deleteDriverDoc(
  driverId: string,
  kind: DriverDocKind,
  path: string,
): Promise<void> {
  if (!supabase) throw new Error("Supabase chưa được cấu hình.");
  const { error: removeError } = await supabase.storage.from("driver-docs").remove([path]);
  if (removeError) throw removeError;

  const column = DRIVER_DOC_COLUMN[kind];
  const { error: updateError } = await supabase
    .from("drivers")
    .update({ [column]: null })
    .eq("id", driverId);
  if (updateError) throw updateError;
}

// ---------------------------------------------------------------------------
// Hồ sơ giấy tờ khách hàng (profile.tsx, stage20) — song song với KYC tài xế
// nhưng chỉ CCCD (khách không có GPLX/selfie riêng). Lưu path trong bucket
// private "customer-docs", đổi thành signed URL mỗi lần hiển thị.
// ---------------------------------------------------------------------------
export interface CustomerKycRow {
  id_number: string | null;
  id_photo_url: string | null;
  id_photo_back_url: string | null;
}

const CUSTOMER_KYC_COLUMNS = "id_number, id_photo_path, id_photo_back_path";

async function signCustomerDocPath(path: string | null): Promise<string | null> {
  if (!supabase || !path) return null;
  const { data } = await supabase.storage.from("customer-docs").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

export async function getCustomerKyc(customerId: string): Promise<CustomerKycRow | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select(CUSTOMER_KYC_COLUMNS)
    .eq("id", customerId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const [id_photo_url, id_photo_back_url] = await Promise.all([
    signCustomerDocPath(data.id_photo_path),
    signCustomerDocPath(data.id_photo_back_path),
  ]);

  return { id_number: data.id_number, id_photo_url, id_photo_back_url };
}

export async function updateCustomerKyc(customerId: string, idNumber: string): Promise<void> {
  if (!supabase) throw new Error("Supabase chưa được cấu hình.");
  const { error } = await supabase
    .from("profiles")
    .update({ id_number: idNumber || null })
    .eq("id", customerId);
  if (error) throw error;
}

const CUSTOMER_DOC_COLUMN = {
  id_front: "id_photo_path",
  id_back: "id_photo_back_path",
} as const;

export type CustomerDocKind = keyof typeof CUSTOMER_DOC_COLUMN;

export async function uploadCustomerDoc(
  customerId: string,
  kind: CustomerDocKind,
  file: File,
): Promise<string | null> {
  if (!supabase) throw new Error("Supabase chưa được cấu hình.");
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${customerId}/${kind}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("customer-docs")
    .upload(path, file, { upsert: true });
  if (uploadError) throw uploadError;

  const column = CUSTOMER_DOC_COLUMN[kind];
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ [column]: path })
    .eq("id", customerId);
  if (updateError) throw updateError;

  return signCustomerDocPath(path);
}

// ---------------------------------------------------------------------------
// Pricing rules (admin.pricing.tsx, booking.tsx)
// ---------------------------------------------------------------------------
const PRICING_REGION = "Cao Lãnh, Đồng Tháp";

export interface PricingRuleRow {
  id: string;
  region: string;
  opening_fee: number;
  minimum_price: number;
  first_distance_limit: number;
  first_distance_price: number;
  price_per_extra_km: number;
  waiting_price_per_minute: number;
  night_surcharge_percent: number;
  night_start_hour: number;
  night_end_hour: number;
}

export function pricingRuleRowToRule(row: PricingRuleRow): PricingRule {
  return {
    openingFee: row.opening_fee,
    minimumPrice: row.minimum_price,
    firstDistanceLimit: row.first_distance_limit,
    firstDistancePrice: row.first_distance_price,
    pricePerExtraKm: row.price_per_extra_km,
    waitingPricePerMinute: row.waiting_price_per_minute,
    nightSurchargePercent: row.night_surcharge_percent,
    nightStartHour: row.night_start_hour,
    nightEndHour: row.night_end_hour,
  };
}

function ruleToDbPatch(rule: PricingRule) {
  return {
    opening_fee: rule.openingFee,
    minimum_price: rule.minimumPrice,
    first_distance_limit: rule.firstDistanceLimit,
    first_distance_price: rule.firstDistancePrice,
    price_per_extra_km: rule.pricePerExtraKm,
    waiting_price_per_minute: rule.waitingPricePerMinute,
    night_surcharge_percent: rule.nightSurchargePercent,
    night_start_hour: rule.nightStartHour,
    night_end_hour: rule.nightEndHour,
  };
}

export async function getPricingRule(): Promise<PricingRuleRow | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("pricing_rules")
    .select(
      "id, region, opening_fee, minimum_price, first_distance_limit, first_distance_price, price_per_extra_km, waiting_price_per_minute, night_surcharge_percent, night_start_hour, night_end_hour",
    )
    .eq("region", PRICING_REGION)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function savePricingRule(rule: PricingRule): Promise<void> {
  if (!supabase) throw new Error("Supabase chưa được cấu hình.");
  const { error } = await supabase
    .from("pricing_rules")
    .update(ruleToDbPatch(rule))
    .eq("region", PRICING_REGION);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Admin dashboard aggregate stats (admin.index.tsx)
// ---------------------------------------------------------------------------
const ACTIVE_TRIP_STATUSES: TripStatusDb[] = [
  "searching",
  "accepted",
  "arriving",
  "arrived",
  "in_progress",
];

export interface AdminDashboardStats {
  tripsToday: number;
  activeTrips: number;
  cancelledToday: number;
  totalCustomers: number;
  driversOnline: number;
  driversTotal: number;
  revenueToday: number;
  revenueMonth: number;
  avgRating: number | null;
  vehicleDistribution: { label: string; percent: number }[];
  revenueLast7Days: { label: string; total: number }[];
  recentTrips: (TripRow & { customer_name: string | null; driver_name: string | null })[];
}

function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

const EMPTY_DASHBOARD_STATS: AdminDashboardStats = {
  tripsToday: 0,
  activeTrips: 0,
  cancelledToday: 0,
  totalCustomers: 0,
  driversOnline: 0,
  driversTotal: 0,
  revenueToday: 0,
  revenueMonth: 0,
  avgRating: null,
  vehicleDistribution: [],
  revenueLast7Days: [],
  recentTrips: [],
};

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  if (!supabase) return EMPTY_DASHBOARD_STATS;
  const client = supabase;
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const sevenDaysAgoStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 6,
  ).toISOString();

  const [
    tripsTodayRes,
    activeRes,
    cancelledTodayRes,
    customersRes,
    driversOnlineRes,
    driversTotalRes,
    completedMonthRes,
    completedLast7Res,
    recentTripsRes,
  ] = await Promise.all([
    client.from("trips").select("id", { count: "exact", head: true }).gte("created_at", todayStart),
    client
      .from("trips")
      .select("id", { count: "exact", head: true })
      .in("status", ACTIVE_TRIP_STATUSES),
    client
      .from("trips")
      .select("id", { count: "exact", head: true })
      .eq("status", "cancelled")
      .gte("created_at", todayStart),
    client.from("profiles").select("id", { count: "exact", head: true }).eq("role", "customer"),
    client.from("drivers").select("id", { count: "exact", head: true }).eq("online", true),
    client.from("drivers").select("id", { count: "exact", head: true }),
    client
      .from("trips")
      .select("price, vehicle_type, customer_rating, completed_at")
      .eq("status", "completed")
      .gte("completed_at", monthStart),
    client
      .from("trips")
      .select("price, completed_at")
      .eq("status", "completed")
      .gte("completed_at", sevenDaysAgoStart),
    client
      .from("trips")
      .select(
        "id, code, customer_id, driver_id, pickup_address, dropoff_address, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, distance_km, duration_min, vehicle_type, payment_method, price, promotion_id, note, status, customer_rating, customer_feedback, started_at, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const completedMonth = completedMonthRes.data ?? [];
  const revenueMonth = completedMonth.reduce((sum, t) => sum + (t.price ?? 0), 0);
  const revenueToday = completedMonth
    .filter((t) => t.completed_at && t.completed_at >= todayStart)
    .reduce((sum, t) => sum + (t.price ?? 0), 0);

  const ratings = completedMonth
    .map((t) => t.customer_rating)
    .filter((r): r is number => r != null);
  const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;

  const vehicleCounts = new Map<string, number>();
  for (const t of completedMonth) {
    const vt = t.vehicle_type ?? "Khác";
    vehicleCounts.set(vt, (vehicleCounts.get(vt) ?? 0) + 1);
  }
  const vehicleDistribution = Array.from(vehicleCounts.entries())
    .map(([label, count]) => ({
      label,
      percent: completedMonth.length ? Math.round((count / completedMonth.length) * 100) : 0,
    }))
    .sort((a, b) => b.percent - a.percent);

  const buckets = new Map<string, number>();
  const dayLabels: { key: string; label: string }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const key = dayKey(d);
    buckets.set(key, 0);
    dayLabels.push({ key, label: d.toLocaleDateString("vi-VN", { weekday: "short" }) });
  }
  for (const t of completedLast7Res.data ?? []) {
    if (!t.completed_at) continue;
    const key = dayKey(new Date(t.completed_at));
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + (t.price ?? 0));
  }
  const revenueLast7Days = dayLabels.map(({ key, label }) => ({
    label,
    total: buckets.get(key) ?? 0,
  }));

  const recentTripsRaw = (recentTripsRes.data ?? []) as TripRow[];
  const nameIds = Array.from(
    new Set(
      recentTripsRaw
        .flatMap((t) => [t.customer_id, t.driver_id])
        .filter((id): id is string => !!id),
    ),
  );
  const namesById = new Map<string, string | null>();
  if (nameIds.length) {
    const { data: nameRows } = await client
      .from("profiles")
      .select("id, full_name")
      .in("id", nameIds);
    for (const row of nameRows ?? []) namesById.set(row.id, row.full_name);
  }
  const recentTrips = recentTripsRaw.map((t) => ({
    ...t,
    customer_name: namesById.get(t.customer_id) ?? null,
    driver_name: t.driver_id ? (namesById.get(t.driver_id) ?? null) : null,
  }));

  return {
    tripsToday: tripsTodayRes.count ?? 0,
    activeTrips: activeRes.count ?? 0,
    cancelledToday: cancelledTodayRes.count ?? 0,
    totalCustomers: customersRes.count ?? 0,
    driversOnline: driversOnlineRes.count ?? 0,
    driversTotal: driversTotalRes.count ?? 0,
    revenueToday,
    revenueMonth,
    avgRating,
    vehicleDistribution,
    revenueLast7Days,
    recentTrips,
  };
}

// ---------------------------------------------------------------------------
// Admin reports (admin.reports.tsx)
// ---------------------------------------------------------------------------
export interface AdminReportsStats {
  monthRevenue: number;
  monthRevenueDeltaPercent: number | null;
  completedTripsMonth: number;
  completedTripsDeltaPercent: number | null;
  cancelRatePercent: number;
  cancelRateDeltaPoints: number | null;
  topDrivers: { id: string; name: string; trips: number; revenue: number }[];
}

const EMPTY_REPORTS_STATS: AdminReportsStats = {
  monthRevenue: 0,
  monthRevenueDeltaPercent: null,
  completedTripsMonth: 0,
  completedTripsDeltaPercent: null,
  cancelRatePercent: 0,
  cancelRateDeltaPoints: null,
  topDrivers: [],
};

export async function getAdminReportsStats(): Promise<AdminReportsStats> {
  if (!supabase) return EMPTY_REPORTS_STATS;
  const client = supabase;
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const lastMonthEnd = thisMonthStart;

  const [completedThisRes, completedLastRes, allThisRes, allLastRes] = await Promise.all([
    client
      .from("trips")
      .select("price, driver_id")
      .eq("status", "completed")
      .gte("completed_at", thisMonthStart),
    client
      .from("trips")
      .select("price")
      .eq("status", "completed")
      .gte("completed_at", lastMonthStart)
      .lt("completed_at", lastMonthEnd),
    client.from("trips").select("status").gte("created_at", thisMonthStart),
    client
      .from("trips")
      .select("status")
      .gte("created_at", lastMonthStart)
      .lt("created_at", lastMonthEnd),
  ]);

  const completedThis = completedThisRes.data ?? [];
  const completedLast = completedLastRes.data ?? [];
  const monthRevenue = completedThis.reduce((s, t) => s + (t.price ?? 0), 0);
  const lastMonthRevenue = completedLast.reduce((s, t) => s + (t.price ?? 0), 0);
  const monthRevenueDeltaPercent =
    lastMonthRevenue > 0
      ? Math.round(((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
      : null;

  const completedTripsMonth = completedThis.length;
  const completedTripsLast = completedLast.length;
  const completedTripsDeltaPercent =
    completedTripsLast > 0
      ? Math.round(((completedTripsMonth - completedTripsLast) / completedTripsLast) * 100)
      : null;

  const allThis = allThisRes.data ?? [];
  const allLast = allLastRes.data ?? [];
  const cancelRatePercent = allThis.length
    ? Math.round((allThis.filter((t) => t.status === "cancelled").length / allThis.length) * 1000) /
      10
    : 0;
  const cancelRateLast = allLast.length
    ? (allLast.filter((t) => t.status === "cancelled").length / allLast.length) * 100
    : null;
  const cancelRateDeltaPoints =
    cancelRateLast != null ? Math.round((cancelRatePercent - cancelRateLast) * 10) / 10 : null;

  const driverAgg = new Map<string, { trips: number; revenue: number }>();
  for (const t of completedThis) {
    if (!t.driver_id) continue;
    const cur = driverAgg.get(t.driver_id) ?? { trips: 0, revenue: 0 };
    cur.trips += 1;
    cur.revenue += t.price ?? 0;
    driverAgg.set(t.driver_id, cur);
  }
  const topDriverEntries = Array.from(driverAgg.entries())
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 5);

  let topDrivers: AdminReportsStats["topDrivers"] = [];
  if (topDriverEntries.length) {
    const ids = topDriverEntries.map(([id]) => id);
    const { data: profs } = await client.from("profiles").select("id, full_name").in("id", ids);
    const nameById = new Map((profs ?? []).map((p) => [p.id, p.full_name]));
    topDrivers = topDriverEntries.map(([id, agg]) => ({
      id,
      name: nameById.get(id) ?? "Tài xế",
      trips: agg.trips,
      revenue: agg.revenue,
    }));
  }

  return {
    monthRevenue,
    monthRevenueDeltaPercent,
    completedTripsMonth,
    completedTripsDeltaPercent,
    cancelRatePercent,
    cancelRateDeltaPoints,
    topDrivers,
  };
}

// ---------------------------------------------------------------------------
// Vị trí tài xế theo thời gian thực (Giai đoạn 7)
// ---------------------------------------------------------------------------
export interface DriverLocation {
  lat: number;
  lng: number;
  updatedAt: string | null;
}

// Tài xế gửi vị trí của chính mình (qua RPC nên không sửa được cột khác).
export async function updateDriverLocation(lat: number, lng: number): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.rpc("update_driver_location", { p_lat: lat, p_lng: lng });
  if (error) throw error;
}

export async function getDriverLocation(driverId: string): Promise<DriverLocation | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("drivers")
    .select("current_lat, current_lng, location_updated_at")
    .eq("id", driverId)
    .maybeSingle();
  if (error) throw error;
  if (!data?.current_lat || !data?.current_lng) return null;
  return { lat: data.current_lat, lng: data.current_lng, updatedAt: data.location_updated_at };
}

// Khách nghe vị trí tài xế đang chở mình — dùng Supabase Realtime (WebSocket).
export function subscribeDriverLocation(
  driverId: string,
  onUpdate: (loc: DriverLocation) => void,
): () => void {
  if (!supabase) return () => {};
  const client = supabase;
  const channel = client
    .channel(`driver-location-${driverId}`)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "drivers", filter: `id=eq.${driverId}` },
      (payload) => {
        const row = payload.new as {
          current_lat: number | null;
          current_lng: number | null;
          location_updated_at: string | null;
        };
        if (row.current_lat != null && row.current_lng != null) {
          onUpdate({
            lat: row.current_lat,
            lng: row.current_lng,
            updatedAt: row.location_updated_at,
          });
        }
      },
    )
    .subscribe();
  return () => {
    client.removeChannel(channel);
  };
}

// ---------------------------------------------------------------------------
// Ví (wallet.tsx) — ghi chỉ qua rpc wallet_topup, số dư/lịch sử đọc trực tiếp.
// ---------------------------------------------------------------------------
export interface WalletRow {
  owner_id: string;
  balance: number;
  updated_at: string;
}

export interface WalletTransactionRow {
  id: string;
  type: "topup" | "trip_payment" | "refund" | "adjustment";
  amount: number;
  description: string | null;
  created_at: string;
}

export async function getWallet(userId: string): Promise<WalletRow | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("wallets")
    .select("owner_id, balance, updated_at")
    .eq("owner_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getWalletTransactions(
  userId: string,
  limit = 20,
): Promise<WalletTransactionRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("wallet_transactions")
    .select("id, type, amount, description, created_at")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function topupWallet(amount: number, description?: string): Promise<void> {
  if (!supabase) throw new Error("Supabase chưa được cấu hình.");
  const { error } = await supabase.rpc("wallet_topup", {
    p_amount: amount,
    p_description: description ?? "Nạp tiền (mô phỏng)",
  });
  if (error) throw error;
}

export function subscribeWallet(userId: string, onUpdate: (row: WalletRow) => void): () => void {
  if (!supabase) return () => {};
  const client = supabase;
  const channel = client
    .channel(`wallet-${userId}`)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "wallets", filter: `owner_id=eq.${userId}` },
      (payload) => onUpdate(payload.new as WalletRow),
    )
    .subscribe();
  return () => {
    client.removeChannel(channel);
  };
}

// ---------------------------------------------------------------------------
// Điểm thưởng (rewards.tsx) — ghi chỉ qua rpc redeem_reward.
// ---------------------------------------------------------------------------
export interface LoyaltyPointsRow {
  owner_id: string;
  balance: number;
  updated_at: string;
}

export interface PointsTransactionRow {
  id: string;
  delta: number;
  reason: string;
  created_at: string;
}

export async function getLoyaltyPoints(userId: string): Promise<LoyaltyPointsRow | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("loyalty_points")
    .select("owner_id, balance, updated_at")
    .eq("owner_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getPointsTransactions(
  userId: string,
  limit = 20,
): Promise<PointsTransactionRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("points_transactions")
    .select("id, delta, reason, created_at")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function redeemReward(cost: number, title: string): Promise<void> {
  if (!supabase) throw new Error("Supabase chưa được cấu hình.");
  const { error } = await supabase.rpc("redeem_reward", { p_cost: cost, p_title: title });
  if (error) throw error;
}

export function subscribeLoyaltyPoints(
  userId: string,
  onUpdate: (row: LoyaltyPointsRow) => void,
): () => void {
  if (!supabase) return () => {};
  const client = supabase;
  const channel = client
    .channel(`points-${userId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "loyalty_points",
        filter: `owner_id=eq.${userId}`,
      },
      (payload) => onUpdate(payload.new as LoyaltyPointsRow),
    )
    .subscribe();
  return () => {
    client.removeChannel(channel);
  };
}

// ---------------------------------------------------------------------------
// Thông báo (notifications.tsx)
// ---------------------------------------------------------------------------
export interface NotificationRow {
  id: string;
  title: string;
  content: string;
  read: boolean;
  created_at: string;
  url: string | null;
}

export async function getNotifications(userId: string, limit = 30): Promise<NotificationRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("notifications")
    .select("id, title, content, read, created_at, url")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function markNotificationRead(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from("notifications").update({ read: true }).eq("id", id);
  if (error) throw error;
}

export function subscribeNotifications(
  userId: string,
  onInsert: (row: NotificationRow) => void,
): () => void {
  if (!supabase) return () => {};
  const client = supabase;
  const channel = client
    .channel(`notifications-${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `owner_id=eq.${userId}`,
      },
      (payload) => onInsert(payload.new as NotificationRow),
    )
    .subscribe();
  return () => {
    client.removeChannel(channel);
  };
}

// ---------------------------------------------------------------------------
// Support tickets (support.tsx, admin.support.tsx)
// ---------------------------------------------------------------------------
export type SupportTicketStatus = "new" | "in_progress" | "resolved";

export interface SupportTicketRow {
  id: string;
  requester_id: string;
  subject: string;
  message: string;
  status: SupportTicketStatus;
  created_at: string;
}

// Khách/tài xế gửi yêu cầu hỗ trợ từ support.tsx.
export async function createSupportTicket(
  requesterId: string,
  subject: string,
  message: string,
): Promise<void> {
  if (!supabase) throw new Error("Supabase chưa được cấu hình.");
  const { error } = await supabase.from("support_tickets").insert({
    requester_id: requesterId,
    subject: subject.trim(),
    message: message.trim(),
  });
  if (error) throw error;
}

// Admin xem toàn bộ ticket — lấy tên người gửi qua bảng profiles riêng, cùng
// cách getAdminDashboardStats()/getAllTripsAdmin() đã làm ở trên.
export async function getSupportTickets(): Promise<
  (SupportTicketRow & { requester_name: string | null })[]
> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("support_tickets")
    .select("id, requester_id, subject, message, status, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const tickets = data ?? [];

  const ids = Array.from(new Set(tickets.map((t) => t.requester_id)));
  const namesById = new Map<string, string | null>();
  if (ids.length) {
    const { data: nameRows } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", ids);
    for (const row of nameRows ?? []) namesById.set(row.id, row.full_name);
  }
  return tickets.map((t) => ({ ...t, requester_name: namesById.get(t.requester_id) ?? null }));
}

export async function updateSupportTicketStatus(
  id: string,
  status: SupportTicketStatus,
): Promise<void> {
  if (!supabase) throw new Error("Supabase chưa được cấu hình.");
  const { error } = await supabase.from("support_tickets").update({ status }).eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Payout requests / rút tiền tài xế (driver.earnings.tsx, admin.payouts.tsx)
// Số dư khả dụng tính THẬT từ tổng chuyến đã hoàn thành qua RPC
// get_driver_payout_summary(); insert chỉ qua RPC request_driver_payout() để
// tài xế không thể tự chèn yêu cầu vượt số dư qua REST API thẳng.
// ---------------------------------------------------------------------------
export type PayoutRequestStatus = "pending" | "paid" | "rejected";

export interface PayoutRequestRow {
  id: string;
  driver_id: string;
  amount: number;
  status: PayoutRequestStatus;
  note: string | null;
  created_at: string;
  processed_at: string | null;
}

export interface DriverPayoutSummary {
  netRevenue: number;
  requestedTotal: number;
  available: number;
}

export async function getDriverPayoutSummary(): Promise<DriverPayoutSummary> {
  if (!supabase) return { netRevenue: 0, requestedTotal: 0, available: 0 };
  const { data, error } = await supabase.rpc("get_driver_payout_summary").single();
  if (error) throw error;
  const row = data as { net_revenue: number; requested_total: number; available: number };
  return {
    netRevenue: row.net_revenue,
    requestedTotal: row.requested_total,
    available: row.available,
  };
}

export async function requestDriverPayout(amount: number): Promise<void> {
  if (!supabase) throw new Error("Supabase chưa được cấu hình.");
  const { error } = await supabase.rpc("request_driver_payout", { p_amount: amount });
  if (error) throw error;
}

export async function getDriverPayoutRequests(driverId: string): Promise<PayoutRequestRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("payout_requests")
    .select("id, driver_id, amount, status, note, created_at, processed_at")
    .eq("driver_id", driverId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export function subscribePayoutRequests(driverId: string, onChange: () => void): () => void {
  if (!supabase) return () => {};
  const client = supabase;
  const channel = client
    .channel(`payout-requests-${driverId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "payout_requests",
        filter: `driver_id=eq.${driverId}`,
      },
      onChange,
    )
    .subscribe();
  return () => {
    client.removeChannel(channel);
  };
}

// ---------------------------------------------------------------------------
// Báo cáo thu nhập tài xế (driver.earnings.tsx) — tổng hợp thật từ trips qua
// RPC get_driver_earnings_summary() (mốc giờ Việt Nam), thay cho công thức
// cộng vào số hardcode trước đây.
// ---------------------------------------------------------------------------
export interface DriverEarningsSummary {
  todayGross: number;
  todayTrips: number;
  weekGross: number;
  monthGross: number;
  monthTrips: number;
  lifetimeTrips: number;
  monthFee: number;
  monthNet: number;
}

export async function getDriverEarningsSummary(): Promise<DriverEarningsSummary> {
  if (!supabase) {
    return {
      todayGross: 0,
      todayTrips: 0,
      weekGross: 0,
      monthGross: 0,
      monthTrips: 0,
      lifetimeTrips: 0,
      monthFee: 0,
      monthNet: 0,
    };
  }
  const { data, error } = await supabase.rpc("get_driver_earnings_summary").single();
  if (error) throw error;
  const row = data as {
    today_gross: number;
    today_trips: number;
    week_gross: number;
    month_gross: number;
    month_trips: number;
    lifetime_trips: number;
    month_fee: number;
    month_net: number;
  };
  return {
    todayGross: row.today_gross,
    todayTrips: row.today_trips,
    weekGross: row.week_gross,
    monthGross: row.month_gross,
    monthTrips: row.month_trips,
    lifetimeTrips: row.lifetime_trips,
    monthFee: row.month_fee,
    monthNet: row.month_net,
  };
}

export interface DriverEarningsTransactionRow {
  id: string;
  code: string;
  price: number;
  completed_at: string;
}

export async function getDriverEarningsTransactions(
  driverId: string,
  limit = 10,
): Promise<DriverEarningsTransactionRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("trips")
    .select("id, code, price, completed_at")
    .eq("driver_id", driverId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).filter((t): t is DriverEarningsTransactionRow => t.completed_at != null);
}

// ---------------------------------------------------------------------------
// Push subscriptions (src/lib/push.ts, notifications.tsx) — lưu PushSubscription
// của trình duyệt để Edge Function send-push đọc và gửi Web Push thật.
// ---------------------------------------------------------------------------
export async function savePushSubscription(
  ownerId: string,
  endpoint: string,
  p256dh: string,
  auth: string,
): Promise<void> {
  if (!supabase) throw new Error("Supabase chưa được cấu hình.");
  const { error } = await supabase
    .from("push_subscriptions")
    .upsert({ owner_id: ownerId, endpoint, p256dh, auth }, { onConflict: "endpoint" });
  if (error) throw error;
}

export async function deletePushSubscription(endpoint: string): Promise<void> {
  if (!supabase) return;
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
}

// Admin xem toàn bộ yêu cầu rút tiền — lấy tên tài xế qua bảng profiles riêng,
// cùng cách getSupportTickets() đã làm ở trên.
export async function getPayoutRequestsAdmin(): Promise<
  (PayoutRequestRow & { driver_name: string | null })[]
> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("payout_requests")
    .select("id, driver_id, amount, status, note, created_at, processed_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const requests = data ?? [];

  const ids = Array.from(new Set(requests.map((r) => r.driver_id)));
  const namesById = new Map<string, string | null>();
  if (ids.length) {
    const { data: nameRows } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", ids);
    for (const row of nameRows ?? []) namesById.set(row.id, row.full_name);
  }
  return requests.map((r) => ({ ...r, driver_name: namesById.get(r.driver_id) ?? null }));
}

export async function updatePayoutRequestStatus(
  id: string,
  status: PayoutRequestStatus,
): Promise<void> {
  if (!supabase) throw new Error("Supabase chưa được cấu hình.");
  const { error } = await supabase
    .from("payout_requests")
    .update({ status, processed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

// Admin xem ví/nợ phí nền tảng của tài xế (mobile Giai đoạn 27: 40%/chuyến
// tiền mặt trừ vào ví, âm = tài xế đang nợ). RLS wallets_select_admin/
// wallet_tx_select_admin (Giai đoạn 28) cho phép admin đọc ví của mọi tài xế.
export interface DriverWalletRow {
  owner_id: string;
  balance: number;
  updated_at: string;
  driver_name: string | null;
}

export async function getDriverWalletsAdmin(): Promise<DriverWalletRow[]> {
  if (!supabase) return [];
  const { data: driverRows, error: driverErr } = await supabase.from("drivers").select("id");
  if (driverErr) throw driverErr;
  const driverIds = (driverRows ?? []).map((d) => d.id);
  if (!driverIds.length) return [];

  const { data, error } = await supabase
    .from("wallets")
    .select("owner_id, balance, updated_at")
    .in("owner_id", driverIds)
    .order("balance", { ascending: true });
  if (error) throw error;
  const wallets = data ?? [];

  const namesById = new Map<string, string | null>();
  const { data: nameRows } = await supabase.from("profiles").select("id, full_name").in("id", driverIds);
  for (const row of nameRows ?? []) namesById.set(row.id, row.full_name);

  return wallets.map((w) => ({ ...w, driver_name: namesById.get(w.owner_id) ?? null }));
}

export interface DriverWalletTransactionRow {
  id: string;
  owner_id: string;
  type: "topup" | "trip_payment" | "refund" | "adjustment";
  amount: number;
  description: string | null;
  created_at: string;
  driver_name: string | null;
}

export async function getDriverWalletTransactionsAdmin(
  limit = 50,
): Promise<DriverWalletTransactionRow[]> {
  if (!supabase) return [];
  const { data: driverRows, error: driverErr } = await supabase.from("drivers").select("id");
  if (driverErr) throw driverErr;
  const driverIds = (driverRows ?? []).map((d) => d.id);
  if (!driverIds.length) return [];

  const { data, error } = await supabase
    .from("wallet_transactions")
    .select("id, owner_id, type, amount, description, created_at")
    .in("owner_id", driverIds)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  const txs = data ?? [];

  const namesById = new Map<string, string | null>();
  const { data: nameRows } = await supabase.from("profiles").select("id, full_name").in("id", driverIds);
  for (const row of nameRows ?? []) namesById.set(row.id, row.full_name);

  return txs.map((t) => ({ ...t, driver_name: namesById.get(t.owner_id) ?? null }));
}

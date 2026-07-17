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
      "id, code, customer_id, driver_id, pickup_address, dropoff_address, distance_km, duration_min, vehicle_type, payment_method, price, promotion_id, note, status, customer_rating, customer_feedback, started_at, created_at",
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
      "id, code, customer_id, driver_id, pickup_address, dropoff_address, distance_km, duration_min, vehicle_type, payment_method, price, promotion_id, note, status, customer_rating, customer_feedback, started_at, created_at",
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
  rating: number;
  trips_count: number;
  years_experience: number;
  vehicle_class: string | null;
}

export async function getAssignedDriverInfo(driverId: string): Promise<AssignedDriverInfo | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, full_name, phone, drivers!inner(rating, trips_count, years_experience, vehicle_class)",
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
    rating: d?.rating ?? 5,
    trips_count: d?.trips_count ?? 0,
    years_experience: d?.years_experience ?? 0,
    vehicle_class: d?.vehicle_class ?? null,
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

// ---------------------------------------------------------------------------
// Promotions (admin.promotions.tsx, promotions.tsx, booking.tsx)
// ---------------------------------------------------------------------------
export interface PromotionRow {
  id: string;
  code: string;
  title: string;
  description: string | null;
  discount: number;
  expires_at: string | null;
  active: boolean;
}

export async function getPromotions(): Promise<PromotionRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("promotions")
    .select("id, code, title, description, discount, expires_at, active")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function findActivePromotionByCode(code: string): Promise<PromotionRow | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("promotions")
    .select("id, code, title, description, discount, expires_at, active")
    .eq("code", code.trim().toUpperCase())
    .eq("active", true)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null;
  return data;
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
        "id, code, customer_id, driver_id, pickup_address, dropoff_address, distance_km, duration_min, vehicle_type, payment_method, price, promotion_id, note, status, customer_rating, customer_feedback, started_at, created_at",
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
}

export async function getNotifications(userId: string, limit = 30): Promise<NotificationRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("notifications")
    .select("id, title, content, read, created_at")
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

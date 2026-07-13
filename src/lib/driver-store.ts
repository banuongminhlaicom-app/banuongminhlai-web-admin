import { useSyncExternalStore } from "react";

export type DriverStatus =
  | "offline"
  | "online"
  | "assigned"
  | "going_to_pickup"
  | "arrived"
  | "met_customer"
  | "in_progress"
  | "completed";

export type DriverTrip = {
  id: string;
  code: string;
  pickup: string;
  pickupAddress: string;
  pickupDistance: number;
  dropoff: string;
  dropoffAddress: string;
  tripDistance: number;
  vehicleType: string;
  transmission: string;
  plate: string;
  price: number;
  note: string;
  bookedAt: string;
  customerName: string;
  customerPhoneMasked: string;
  pin: string;
  startedAt?: number;
  waitMinutes?: number;
};

export type DriverState = {
  authed: boolean;
  online: boolean;
  autoAccept: boolean;
  status: DriverStatus;
  currentTrip: DriverTrip | null;
  todayTrips: number;
  todayRevenue: number;
  onlineSince: number | null;
};

const KEY = "buml.driver.state.v1";

const DEFAULT: DriverState = {
  authed: false,
  online: false,
  autoAccept: true,
  status: "offline",
  currentTrip: null,
  todayTrips: 7,
  todayRevenue: 890000,
  onlineSince: null,
};

function load(): DriverState {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT;
    return { ...DEFAULT, ...JSON.parse(raw) };
  } catch {
    return DEFAULT;
  }
}

let state: DriverState = DEFAULT;
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

function ensureHydrated() {
  if (hydrated || typeof window === "undefined") return;
  state = load();
  hydrated = true;
}

export const driverStore = {
  get(): DriverState {
    ensureHydrated();
    return state;
  },
  subscribe(l: () => void) {
    ensureHydrated();
    listeners.add(l);
    return () => listeners.delete(l);
  },
  set(patch: Partial<DriverState>) {
    ensureHydrated();
    state = { ...state, ...patch };
    persist();
    emit();
  },
  reset() {
    state = DEFAULT;
    persist();
    emit();
  },
};

export function useDriver(): DriverState {
  return useSyncExternalStore(
    driverStore.subscribe,
    driverStore.get,
    () => DEFAULT,
  );
}

export const DEMO_TRIP: DriverTrip = {
  id: "8821",
  code: "BUML-8821",
  pickup: "Quán Bia Sài Gòn",
  pickupAddress: "128 Nguyễn Huệ, P.2, Cao Lãnh",
  pickupDistance: 1.2,
  dropoff: "Chung cư Mỹ Phú",
  dropoffAddress: "Đường Lê Đại Hành, P. Mỹ Phú, Cao Lãnh",
  tripDistance: 6.8,
  vehicleType: "Toyota Vios 2022",
  transmission: "Số tự động",
  plate: "66A-123.45",
  price: 127000,
  note: "Xe Vios màu đen đậu trước quán. Gọi khi tới, khách đang ở lễ tân.",
  bookedAt: "20:15 hôm nay",
  customerName: "Nguyễn Văn An",
  customerPhoneMasked: "+84 901 ••• 567",
  pin: "2684",
};

import type { Session } from "@supabase/supabase-js";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useSyncExternalStore } from "react";
import { isSupabaseConfigured, supabase } from "./supabase";

export type UserRole = "customer" | "driver" | "admin";

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string | null;
  phone: string | null;
}

type AuthStatus = "loading" | "signed_out" | "signed_in";

interface AuthState {
  status: AuthStatus;
  session: Session | null;
  profile: Profile | null;
}

const DEFAULT_STATE: AuthState = { status: "loading", session: null, profile: null };

let state: AuthState = DEFAULT_STATE;
let initialized = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function setState(patch: Partial<AuthState>) {
  state = { ...state, ...patch };
  emit();
}

async function loadProfile(userId: string): Promise<Profile | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, full_name, phone")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    console.error("loadProfile error", error);
    return null;
  }
  return data as Profile | null;
}

async function refreshFromSession(session: Session | null) {
  if (!session) {
    setState({ status: "signed_out", session: null, profile: null });
    return;
  }
  const profile = await loadProfile(session.user.id);
  setState({ status: "signed_in", session, profile });
}

function ensureInitialized() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  if (!isSupabaseConfigured || !supabase) {
    setState({ status: "signed_out", session: null, profile: null });
    return;
  }

  supabase.auth.getSession().then(({ data }) => refreshFromSession(data.session));
  supabase.auth.onAuthStateChange((_event, session) => {
    refreshFromSession(session);
  });
}

export const authStore = {
  get(): AuthState {
    ensureInitialized();
    return state;
  },
  subscribe(listener: () => void) {
    ensureInitialized();
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export function useAuthState(): AuthState {
  return useSyncExternalStore(authStore.subscribe, authStore.get, () => DEFAULT_STATE);
}

// Tạo hồ sơ nếu chưa có. Nếu đã có, KHÔNG đổi role — tránh trường hợp đăng
// nhập lại vô tình leo quyền (vd. số điện thoại customer bị dùng thử ở form driver).
export async function ensureProfile(userId: string, role: UserRole, phone: string | null) {
  if (!supabase) return;
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  if (existing) return;

  const { error: profileError } = await supabase
    .from("profiles")
    .insert({ id: userId, role, phone });
  if (profileError) throw profileError;

  if (role === "driver") {
    const { error: driverError } = await supabase.from("drivers").insert({ id: userId });
    if (driverError) throw driverError;
  }

  if (role === "customer") {
    await supabase.from("wallets").insert({ owner_id: userId, balance: 0 });
    await supabase.from("loyalty_points").insert({ owner_id: userId, balance: 0 });
  }
}

export async function signInWithGoogle(redirectPath: string = "/login") {
  if (!supabase) {
    throw new Error(
      "Supabase chưa được cấu hình (.env thiếu VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY).",
    );
  }
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${window.location.origin}${redirectPath}` },
  });
  if (error) throw error;
}

export async function sendPhoneOtp(phone: string) {
  if (!supabase) {
    throw new Error(
      "Supabase chưa được cấu hình (.env thiếu VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY).",
    );
  }
  const { error } = await supabase.auth.signInWithOtp({ phone });
  if (error) throw error;
}

export async function verifyPhoneOtp(
  phone: string,
  token: string,
  role: Extract<UserRole, "customer" | "driver">,
): Promise<Session> {
  if (!supabase) {
    throw new Error(
      "Supabase chưa được cấu hình (.env thiếu VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY).",
    );
  }
  const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: "sms" });
  if (error) throw error;
  const session = data.session;
  if (!session) throw new Error("Không lấy được phiên đăng nhập sau khi xác thực OTP.");

  await ensureProfile(session.user.id, role, phone);
  await refreshFromSession(session);
  return session;
}

export async function signInAdmin(email: string, password: string): Promise<Session> {
  if (!supabase) {
    throw new Error(
      "Supabase chưa được cấu hình (.env thiếu VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY).",
    );
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  const session = data.session;
  if (!session) throw new Error("Không lấy được phiên đăng nhập.");

  const profile = await loadProfile(session.user.id);
  if (!profile || profile.role !== "admin") {
    await supabase.auth.signOut();
    setState({ status: "signed_out", session: null, profile: null });
    throw new Error("Tài khoản này không có quyền admin.");
  }

  setState({ status: "signed_in", session, profile });
  return session;
}

export async function signOutAuth() {
  if (!supabase) return;
  await supabase.auth.signOut();
  setState({ status: "signed_out", session: null, profile: null });
}

const LOGIN_PATH: Record<UserRole, string> = {
  customer: "/login",
  driver: "/driver/login",
  admin: "/admin/login",
};

// Guard client-side cho các trang cần đăng nhập đúng vai trò — cùng kiểu với
// useEffect redirect đã có sẵn trong driver.index.tsx trước khi có Supabase.
export function useRequireRole(role: UserRole): AuthState {
  const state = useAuthState();
  const navigate = useNavigate();

  useEffect(() => {
    if (state.status === "loading") return;
    if (state.status === "signed_out" || state.profile?.role !== role) {
      navigate({ to: LOGIN_PATH[role] });
    }
  }, [state.status, state.profile, role, navigate]);

  return state;
}

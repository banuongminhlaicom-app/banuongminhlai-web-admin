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
  avatar_url: string | null;
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

// Chặn listener onAuthStateChange tự chạy refreshFromSession() SONG SONG với
// 1 luồng đăng nhập thủ công (signInAdmin/verifyPhoneOtp) đang tự tải
// profile + setState của chính nó — 2 lần loadProfile() độc lập cho CÙNG 1
// sự kiện đăng nhập có thể trả về khác nhau do thời điểm request (token của
// client REST đôi khi chưa kịp cập nhật ngay khi sự kiện bắn ra), lần nào
// xong sau sẽ ghi đè lần trước. Từng gây lỗi: đăng nhập admin thành công,
// dashboard hiện ra 1 chớp rồi tự bị đá về lại trang login vì listener kia
// lỡ trả về profile null rồi ghi đè state đúng vừa thiết lập.
let manualAuthInFlight = false;

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
    .select("id, role, full_name, phone, avatar_url")
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
    if (manualAuthInFlight) return;
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

// Tải lại profile của phiên hiện tại vào store — gọi sau khi sửa hồ sơ
// (đổi tên/avatar) để UI cập nhật ngay, không cần load lại trang.
export async function refreshProfile(): Promise<void> {
  if (!state.session) return;
  const profile = await loadProfile(state.session.user.id);
  setState({ profile });
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
  // 23505 = trùng khoá chính (unique_violation) — 1 lượt gọi ensureProfile()
  // khác chạy song song (getSession() và onAuthStateChange() cùng bắn ra ngay
  // sau khi quay lại từ OAuth) đã tạo hồ sơ trước rồi. Không phải lỗi thật —
  // bỏ qua để không hiện toast "Không tạo được hồ sơ." dù thực ra vẫn vào được.
  if (profileError) {
    if (profileError.code === "23505") return;
    throw profileError;
  }

  if (role === "driver") {
    const { error: driverError } = await supabase.from("drivers").insert({ id: userId });
    if (driverError && driverError.code !== "23505") throw driverError;
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
  manualAuthInFlight = true;
  try {
    const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: "sms" });
    if (error) throw error;
    const session = data.session;
    if (!session) throw new Error("Không lấy được phiên đăng nhập sau khi xác thực OTP.");

    await ensureProfile(session.user.id, role, phone);
    await refreshFromSession(session);
    return session;
  } finally {
    manualAuthInFlight = false;
  }
}

export async function signInAdmin(email: string, password: string): Promise<Session> {
  if (!supabase) {
    throw new Error(
      "Supabase chưa được cấu hình (.env thiếu VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY).",
    );
  }
  manualAuthInFlight = true;
  try {
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
  } finally {
    manualAuthInFlight = false;
  }
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
// Nhận 1 vai trò hoặc mảng vai trò (vd. trang /notifications dùng chung cho
// cả khách lẫn tài xế) — sai vai trò thì điều hướng về trang login của vai
// trò đầu tiên trong danh sách.
export function useRequireRole(role: UserRole | UserRole[]): AuthState {
  const state = useAuthState();
  const navigate = useNavigate();
  const roles = Array.isArray(role) ? role : [role];
  const rolesKey = roles.join(",");

  useEffect(() => {
    if (state.status === "loading") return;
    if (state.status === "signed_out" || !state.profile || !roles.includes(state.profile.role)) {
      navigate({ to: LOGIN_PATH[roles[0]] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status, state.profile, rolesKey, navigate]);

  return state;
}

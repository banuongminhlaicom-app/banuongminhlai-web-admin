import { deletePushSubscription, savePushSubscription } from "@/lib/queries";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

export function isPushConfigured(): boolean {
  return !!VAPID_PUBLIC_KEY;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

// PushManager.subscribe() cần applicationServerKey dạng Uint8Array, còn VAPID
// public key ta có là base64url — chuyển đổi theo chuẩn MDN.
function urlBase64ToUint8Array(base64Url: string): Uint8Array {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export async function getExistingPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.getRegistration("/sw.js");
  if (!registration) return null;
  return registration.pushManager.getSubscription();
}

export async function subscribeToPush(ownerId: string): Promise<void> {
  if (!isPushSupported()) throw new Error("Trình duyệt này không hỗ trợ thông báo đẩy.");
  if (!VAPID_PUBLIC_KEY) throw new Error("Thông báo đẩy chưa được cấu hình (thiếu VAPID key).");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Bạn cần cho phép quyền thông báo để bật tính năng này.");
  }

  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
    });
  }

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error("Không lấy được thông tin đăng ký thông báo đẩy.");
  }

  await savePushSubscription(ownerId, json.endpoint, json.keys.p256dh, json.keys.auth);
}

export async function unsubscribeFromPush(): Promise<void> {
  const subscription = await getExistingPushSubscription();
  if (!subscription) return;
  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  await deletePushSubscription(endpoint);
}

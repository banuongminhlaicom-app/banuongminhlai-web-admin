// Edge Function: gửi push thật khi có dòng mới trong public.notifications —
// Web Push (VAPID) cho subscription platform='web', Expo Push API cho
// platform='mobile' (app di động, token dạng ExponentPushToken[...], không
// cần ký VAPID — Expo tự lo phần gửi tới APNs/FCM). Được gọi qua Database
// Webhook (Dashboard > Database > Webhooks > New webhook > Table:
// notifications > Events: Insert > Type: Supabase Edge Function). Webhook do
// Dashboard tạo tự kèm Authorization header hợp lệ nên verify_jwt mặc định
// của function vẫn chạy bình thường, không cần tắt.
//
// Secrets cần set trước khi deploy (supabase secrets set ...) — chỉ cho phần
// Web Push, Expo Push API không cần secret nào:
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY  — từ `npx web-push generate-vapid-keys`
//   VAPID_SUBJECT                        — vd. mailto:admin@banuongminhlai.vn
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY do runtime tự bơm sẵn, không cần set.

import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:support@example.com";

webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

const supabase = createClient(supabaseUrl, serviceRoleKey);

const EXPO_PUSH_ENDPOINT = "https://exp.host/--/api/v2/push/send";

interface NotificationRecord {
  id: string;
  owner_id: string;
  title: string;
  content: string;
  url: string | null;
}

interface WebhookPayload {
  type: string;
  table: string;
  record: NotificationRecord;
}

interface PushSubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string | null;
  auth: string | null;
  platform: "web" | "mobile";
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let payload: WebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const record = payload.record;
  if (!record?.owner_id) {
    return new Response("Missing record.owner_id", { status: 400 });
  }

  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth, platform")
    .eq("owner_id", record.owner_id);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
  if (!subscriptions || subscriptions.length === 0) {
    return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
  }

  const rows = subscriptions as PushSubscriptionRow[];
  const webRows = rows.filter((r) => r.platform !== "mobile");
  const mobileRows = rows.filter((r) => r.platform === "mobile");

  const staleIds: string[] = [];
  let sent = 0;

  if (webRows.length > 0) {
    const body = JSON.stringify({
      title: record.title,
      body: record.content,
      url: record.url ?? "/notifications",
    });

    const results = await Promise.allSettled(
      webRows.map((sub) =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh!, auth: sub.auth! } },
          body,
        ),
      ),
    );

    results.forEach((result, i) => {
      if (result.status === "fulfilled") {
        sent++;
        return;
      }
      const statusCode = (result.reason as { statusCode?: number })?.statusCode;
      if (statusCode === 404 || statusCode === 410) {
        staleIds.push(webRows[i].id);
      }
    });
  }

  // Expo Push API nhận 1 mảng message trong 1 request (tối đa 100 phần tử/lần
  // — số thiết bị của 1 người dùng luôn nhỏ hơn nhiều nên không cần chia lô).
  if (mobileRows.length > 0) {
    const messages = mobileRows.map((sub) => ({
      to: sub.endpoint,
      title: record.title,
      body: record.content,
      data: { url: record.url ?? "/notifications" },
    }));

    try {
      const res = await fetch(EXPO_PUSH_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(messages),
      });
      const json = await res.json();
      const tickets: Array<{ status: string; details?: { error?: string } }> = json?.data ?? [];

      tickets.forEach((ticket, i) => {
        if (ticket.status === "ok") {
          sent++;
          return;
        }
        if (ticket.details?.error === "DeviceNotRegistered") {
          staleIds.push(mobileRows[i].id);
        }
      });
    } catch (err) {
      console.error("Gửi Expo Push thất bại:", err);
    }
  }

  if (staleIds.length > 0) {
    await supabase.from("push_subscriptions").delete().in("id", staleIds);
  }

  return new Response(JSON.stringify({ sent, removed: staleIds.length }), { status: 200 });
});

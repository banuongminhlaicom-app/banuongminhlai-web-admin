# send-push

Gửi push thật tới trình duyệt/thiết bị đã đăng ký, khi có dòng mới trong
`public.notifications` — Web Push (VAPID) cho subscription của web
(`platform='web'`), Expo Push API cho subscription của app mobile
(`platform='mobile'`, xem `register_push_token()` trong migration stage 25 và
`lib/notifications.ts` bên repo mobile). Không tự deploy hay tự chạy được từ
agent — cần bạn làm các bước sau (một lần):

## 1. Deploy function

```bash
npx supabase login
npx supabase link --project-ref dwnkhqmgpiecvxyclnty
npx supabase functions deploy send-push
```

## 2. Set secrets (VAPID key đã tạo sẵn, lấy từ file `.env` ở gốc repo)

```bash
npx supabase secrets set VAPID_PUBLIC_KEY=BLqwd6hXnVgZDP6aCJ8gMxNpW7a1sul7GfSWwwutlyHKb-KamT1jFOVy9m_lix1l8cxwR-NmcH_vqvubdhQUw4c
npx supabase secrets set VAPID_PRIVATE_KEY=1YkYHkrGl9Dc7R4rDhIVF7TU5ap3lVkG5NyXkbToICE
npx supabase secrets set VAPID_SUBJECT=mailto:janmotorbike.com@gmail.com
```

(`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` không cần set — runtime tự bơm
sẵn. Expo Push API cũng không cần secret nào để gọi.)

## 3. Tạo Database Webhook để gọi function này

Supabase Dashboard → **Database → Webhooks → Create a new hook**:

- Name: `send-push-on-notification`
- Table: `notifications`
- Events: chỉ tick **Insert**
- Type: **Supabase Edge Functions**
- Edge Function: `send-push`
- HTTP method: `POST`

Dashboard tự thêm header `Authorization` hợp lệ nên không cần cấu hình gì thêm.

## 4. Kiểm tra

Sau khi hoàn tất 3 bước trên, mọi lần có dòng mới trong `notifications` (tài
xế được gán chuyến, khách/tài xế nhắn tin, trạng thái chuyến đổi...) sẽ tự gửi
push tới các thiết bị đã bật "Thông báo đẩy" ở trang `/notifications` trong
app. Xem log function tại Dashboard → Edge Functions → send-push → Logs nếu
push không tới.

Chưa deploy function này thì các thông báo trong app (chuông + Realtime) vẫn
hoạt động bình thường như trước — chỉ là chưa có push khi tắt tab/trình duyệt.

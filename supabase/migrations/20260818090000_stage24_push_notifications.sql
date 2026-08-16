-- Giai đoạn 24: hạ tầng DB cho push notification thật (Web Push) — trước đây
-- trang /notifications chỉ dựa vào Supabase Realtime nên tắt tab là mất
-- thông báo. Phần gửi push thật nằm ở Edge Function supabase/functions/send-push
-- (Deno + web-push, ký bằng VAPID) được gọi qua Database Webhook khi có dòng
-- mới trong notifications — xem hướng dẫn deploy trong README của function đó.
-- File idempotent.

-- ---------------------------------------------------------------------------
-- notifications.url: đường dẫn trong app để mở khi bấm vào push notification
-- (vd. /booking/<id>, /driver/trips/<id>). NULL = mở trang /notifications.
-- ---------------------------------------------------------------------------
alter table public.notifications add column if not exists url text;

-- ---------------------------------------------------------------------------
-- push_subscriptions: PushSubscription (endpoint + khoá mã hoá) của từng thiết
-- bị/trình duyệt đã đăng ký nhận push cho 1 người dùng. Một người có thể có
-- nhiều subscription (nhiều thiết bị). Edge Function dùng service role nên
-- không bị RLS chặn khi đọc để gửi push.
-- ---------------------------------------------------------------------------
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

comment on table public.push_subscriptions is
  'PushSubscription của trình duyệt/thiết bị — Edge Function send-push đọc bảng này (service role, bỏ qua RLS) để gửi Web Push thật.';

create index if not exists push_subscriptions_owner_idx on public.push_subscriptions (owner_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists push_subscriptions_select_own on public.push_subscriptions;
create policy push_subscriptions_select_own on public.push_subscriptions
  for select using (owner_id = auth.uid());

drop policy if exists push_subscriptions_insert_own on public.push_subscriptions;
create policy push_subscriptions_insert_own on public.push_subscriptions
  for insert with check (owner_id = auth.uid());

drop policy if exists push_subscriptions_delete_own on public.push_subscriptions;
create policy push_subscriptions_delete_own on public.push_subscriptions
  for delete using (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Thông báo cho KHÁCH khi trạng thái chuyến đổi — cập nhật lại hàm cũ (giai
-- đoạn 6) để set thêm url cho push/deep-link.
-- ---------------------------------------------------------------------------
create or replace function public.trips_notify_customer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title text;
  v_content text;
begin
  if new.status = old.status then return new; end if;

  case new.status
    when 'accepted' then
      v_title := 'Tài xế đã nhận chuyến';
      v_content := 'Tài xế sẽ đến đón bạn tại ' || new.pickup_address || '.';
    when 'arrived' then
      v_title := 'Tài xế đã đến điểm đón';
      v_content := 'Tài xế đang chờ bạn tại điểm đón.';
    when 'in_progress' then
      v_title := 'Chuyến đi bắt đầu';
      v_content := 'Chúc bạn có chuyến đi an toàn.';
    when 'completed' then
      v_title := 'Chuyến đi hoàn thành';
      v_content := 'Cảm ơn bạn đã sử dụng dịch vụ. Đừng quên đánh giá tài xế!';
    when 'cancelled' then
      v_title := 'Chuyến đi đã huỷ';
      v_content := 'Chuyến ' || new.code || ' đã được huỷ.';
    else
      return new;
  end case;

  insert into public.notifications (owner_id, title, content, url)
    values (new.customer_id, v_title, v_content, '/booking/' || new.id);
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Thông báo cho TÀI XẾ khi được gán 1 chuyến mới (dispatch chỉ gán driver_id,
-- status vẫn là 'searching' nên trigger trips_notify_customer không bắt được
-- sự kiện này — cần trigger riêng theo dõi driver_id).
-- ---------------------------------------------------------------------------
create or replace function public.trips_notify_driver()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.driver_id is null then return new; end if;
  if old.driver_id is not distinct from new.driver_id then return new; end if;

  insert into public.notifications (owner_id, title, content, url)
    values (
      new.driver_id,
      'Bạn có chuyến mới!',
      'Đón khách tại ' || new.pickup_address || '.',
      '/driver/trips/' || new.id
    );
  return new;
end;
$$;

drop trigger if exists trips_notify_driver_trigger on public.trips;
create trigger trips_notify_driver_trigger
  after update on public.trips
  for each row execute function public.trips_notify_driver();

-- ---------------------------------------------------------------------------
-- Thông báo tin nhắn chat mới cho người NHẬN (không phải người gửi) — trước
-- đây tin nhắn chỉ tới được nếu người nhận đang mở sẵn tab/app.
-- ---------------------------------------------------------------------------
create or replace function public.trip_messages_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
  v_driver_id uuid;
  v_recipient uuid;
  v_url text;
begin
  select customer_id, driver_id into v_customer_id, v_driver_id
  from public.trips where id = new.trip_id;

  if new.sender_id = v_customer_id then
    v_recipient := v_driver_id;
    v_url := '/driver/trips/' || new.trip_id;
  else
    v_recipient := v_customer_id;
    v_url := '/booking/' || new.trip_id;
  end if;

  if v_recipient is null then return new; end if;

  insert into public.notifications (owner_id, title, content, url)
    values (v_recipient, 'Tin nhắn mới', new.content, v_url);
  return new;
end;
$$;

drop trigger if exists trip_messages_notify_trigger on public.trip_messages;
create trigger trip_messages_notify_trigger
  after insert on public.trip_messages
  for each row execute function public.trip_messages_notify();

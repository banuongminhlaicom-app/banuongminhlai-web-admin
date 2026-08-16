-- Giai đoạn 25: hỗ trợ Expo push token (app mobile) trong push_subscriptions —
-- trước đây bảng này chỉ chứa PushSubscription của trình duyệt (Web Push:
-- endpoint + p256dh + auth). App mobile không có 3 giá trị đó, chỉ có 1 chuỗi
-- Expo push token duy nhất (dạng ExponentPushToken[...]) — lưu chuỗi đó vào
-- cột endpoint (đã unique sẵn), đánh dấu platform='mobile', p256dh/auth để
-- NULL. Đăng ký qua RPC (security definer) thay vì upsert trực tiếp từ
-- client: nếu cùng 1 thiết bị trước đó đăng nhập tài khoản khác (token trùng
-- endpoint nhưng owner_id cũ khác), policy update thường (owner_id =
-- auth.uid()) sẽ chặn vì owner_id cũ không khớp auth.uid() hiện tại — RPC bỏ
-- qua RLS để luôn gán lại đúng chủ sở hữu mới nhất, giống cách
-- request_driver_payout()/update_driver_location() đã làm cho các thao tác
-- ghi khác. File idempotent.

alter table public.push_subscriptions add column if not exists platform text not null default 'web';

do $$ begin
  alter table public.push_subscriptions
    add constraint push_subscriptions_platform_check check (platform in ('web', 'mobile'));
exception when duplicate_object then null;
end $$;

-- p256dh/auth chỉ có ý nghĩa với Web Push — mobile không dùng.
alter table public.push_subscriptions alter column p256dh drop not null;
alter table public.push_subscriptions alter column auth drop not null;

do $$ begin
  alter table public.push_subscriptions
    add constraint push_subscriptions_web_keys_check
    check (platform <> 'web' or (p256dh is not null and auth is not null));
exception when duplicate_object then null;
end $$;

create or replace function public.register_push_token(p_token text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.push_subscriptions (owner_id, endpoint, platform, p256dh, auth)
  values (auth.uid(), p_token, 'mobile', null, null)
  on conflict (endpoint) do update
    set owner_id = excluded.owner_id, platform = 'mobile', p256dh = null, auth = null;
$$;

grant execute on function public.register_push_token(text) to authenticated;

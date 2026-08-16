-- Giai đoạn 22: yêu cầu rút tiền cho tài xế — trước đây nút "Yêu cầu rút tiền"
-- ở driver.earnings.tsx không có xử lý gì. Số dư khả dụng được tính THẬT từ
-- tổng giá trị các chuyến đã hoàn thành (trừ phí nền tảng 15%) trừ đi các yêu
-- cầu đã gửi/đã trả, để tài xế không thể rút vượt quá thu nhập thực tế. Việc
-- chuyển tiền thật (ra ngân hàng tài xế) vẫn là thao tác thủ công của admin —
-- giống cách admin duyệt hồ sơ KYC — chưa nối cổng thanh toán tự động. File
-- idempotent.

create table if not exists public.payout_requests (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.profiles (id) on delete cascade,
  amount numeric(12, 0) not null check (amount > 0),
  status text not null default 'pending' check (status in ('pending', 'paid', 'rejected')),
  note text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

comment on table public.payout_requests is
  'Yêu cầu rút thu nhập của tài xế — gửi ở driver.earnings.tsx, xử lý (chuyển khoản thủ công) ở admin.payouts.tsx.';

create index if not exists payout_requests_driver_idx on public.payout_requests (driver_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Số dư khả dụng thật: tổng giá các chuyến đã hoàn thành * 0.85 (sau phí nền
-- tảng 15%, khớp con số đang hiển thị ở driver.earnings.tsx), trừ đi các yêu
-- cầu rút đang chờ/đã trả (không trừ các yêu cầu bị từ chối).
-- ---------------------------------------------------------------------------
create or replace function public.get_driver_payout_summary()
returns table (net_revenue numeric, requested_total numeric, available numeric)
language sql
security definer
set search_path = public
as $$
  select
    coalesce((
      select sum(t.price) * 0.85 from public.trips t
      where t.driver_id = auth.uid() and t.status = 'completed'
    ), 0) as net_revenue,
    coalesce((
      select sum(pr.amount) from public.payout_requests pr
      where pr.driver_id = auth.uid() and pr.status in ('pending', 'paid')
    ), 0) as requested_total,
    coalesce((
      select sum(t.price) * 0.85 from public.trips t
      where t.driver_id = auth.uid() and t.status = 'completed'
    ), 0) - coalesce((
      select sum(pr.amount) from public.payout_requests pr
      where pr.driver_id = auth.uid() and pr.status in ('pending', 'paid')
    ), 0) as available;
$$;

grant execute on function public.get_driver_payout_summary() to authenticated;

create or replace function public.request_driver_payout(p_amount numeric)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_available numeric;
  v_id uuid;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Số tiền rút không hợp lệ';
  end if;

  select available into v_available from public.get_driver_payout_summary();
  if p_amount > v_available then
    raise exception 'Số dư khả dụng không đủ để rút số tiền này';
  end if;

  insert into public.payout_requests (driver_id, amount) values (auth.uid(), p_amount)
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.request_driver_payout(numeric) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS: tài xế chỉ đọc yêu cầu của chính mình (chèn chỉ qua hàm ở trên, không
-- có policy insert cho authenticated — giống wallet_topup()). Admin đọc/sửa
-- tất cả để đổi trạng thái paid/rejected sau khi chuyển khoản thủ công.
-- ---------------------------------------------------------------------------
alter table public.payout_requests enable row level security;

drop policy if exists payout_requests_select_own on public.payout_requests;
create policy payout_requests_select_own on public.payout_requests
  for select using (driver_id = auth.uid());

drop policy if exists payout_requests_select_admin on public.payout_requests;
create policy payout_requests_select_admin on public.payout_requests
  for select using (public.is_admin());

drop policy if exists payout_requests_update_admin on public.payout_requests;
create policy payout_requests_update_admin on public.payout_requests
  for update using (public.is_admin())
  with check (public.is_admin());

do $$ begin
  alter publication supabase_realtime add table public.payout_requests;
exception when duplicate_object then null;
end $$;

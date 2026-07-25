-- Hệ thống ticket hỗ trợ thật: trước đây admin.support.tsx là mảng cứng và
-- support.tsx (khách) không có nút nào gửi được gì. Khách/tài xế gửi yêu cầu
-- từ support.tsx, admin xử lý (đổi trạng thái) ở admin.support.tsx. File idempotent.

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  subject text not null,
  message text not null,
  status text not null default 'new' check (status in ('new', 'in_progress', 'resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.support_tickets is
  'Yêu cầu hỗ trợ từ khách/tài xế — gửi ở support.tsx, xử lý ở admin.support.tsx.';

alter table public.support_tickets enable row level security;

-- Người gửi tự tạo + xem lại ticket của chính mình.
drop policy if exists support_tickets_insert_own on public.support_tickets;
create policy support_tickets_insert_own on public.support_tickets
  for insert with check (requester_id = auth.uid());

drop policy if exists support_tickets_select_own on public.support_tickets;
create policy support_tickets_select_own on public.support_tickets
  for select using (requester_id = auth.uid());

-- Admin xem + đổi trạng thái tất cả ticket.
drop policy if exists support_tickets_select_admin on public.support_tickets;
create policy support_tickets_select_admin on public.support_tickets
  for select using (public.is_admin());

drop policy if exists support_tickets_update_admin on public.support_tickets;
create policy support_tickets_update_admin on public.support_tickets
  for update using (public.is_admin())
  with check (public.is_admin());

-- Dùng lại public.set_updated_at() đã có sẵn từ init_schema.sql.
create or replace trigger support_tickets_set_updated_at
  before update on public.support_tickets
  for each row
  execute function public.set_updated_at();

-- Giai đoạn 1: RLS policy cho profiles + drivers, gắn với Supabase Auth thật.
-- Idempotent: dùng `drop policy if exists` trước mỗi `create policy` nên chạy lại
-- nhiều lần vẫn an toàn.

-- ---------------------------------------------------------------------------
-- Helper: is_admin() — SECURITY DEFINER để tránh đệ quy RLS khi policy trên
-- chính bảng profiles cần kiểm tra role của người gọi.
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select using (id = auth.uid());

drop policy if exists profiles_select_admin on public.profiles;
create policy profiles_select_admin on public.profiles
  for select using (public.is_admin());

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert with check (id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- drivers
-- ---------------------------------------------------------------------------
drop policy if exists drivers_select_own on public.drivers;
create policy drivers_select_own on public.drivers
  for select using (id = auth.uid());

drop policy if exists drivers_select_admin on public.drivers;
create policy drivers_select_admin on public.drivers
  for select using (public.is_admin());

drop policy if exists drivers_insert_own on public.drivers;
create policy drivers_insert_own on public.drivers
  for insert with check (id = auth.uid());

drop policy if exists drivers_update_own on public.drivers;
create policy drivers_update_own on public.drivers
  for update using (id = auth.uid()) with check (id = auth.uid());

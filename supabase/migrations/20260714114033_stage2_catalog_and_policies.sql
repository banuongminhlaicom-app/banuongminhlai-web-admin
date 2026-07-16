-- Giai đoạn 2: catalog loại xe + cột phê duyệt tài xế + RLS cho các bảng
-- dữ liệu tĩnh (addresses, promotions, vehicle_types). Idempotent.

-- ---------------------------------------------------------------------------
-- vehicle_types: khớp VEHICLE_TYPES trong src/lib/mock.ts
-- ---------------------------------------------------------------------------
create table if not exists public.vehicle_types (
  id text primary key,
  label text not null,
  description text,
  icon text,
  multiplier numeric(4, 2) not null default 1,
  sort_order integer not null default 0
);

comment on table public.vehicle_types is 'Catalog loại phương tiện + hệ số giá, dùng ở booking.tsx.';

insert into public.vehicle_types (id, label, description, icon, multiplier, sort_order) values
  ('moto', 'Xe máy', 'Đón nhanh, tiết kiệm', '🏍️', 0.8, 1),
  ('auto', 'Ô tô số tự động', 'Phổ biến nhất', '🚗', 1, 2),
  ('manual', 'Ô tô số sàn', 'Yêu cầu tài xế hạng B2+', '🚙', 1.1, 3),
  ('7seat', 'Xe từ 7 chỗ', 'Nhóm bạn, gia đình', '🚐', 1.25, 4)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- drivers.approved: cờ phê duyệt hồ sơ tài xế, dùng ở admin.drivers.tsx
-- ---------------------------------------------------------------------------
alter table public.drivers add column if not exists approved boolean not null default false;

-- ---------------------------------------------------------------------------
-- RLS: vehicle_types — ai đăng nhập cũng đọc được, chỉ admin ghi
-- ---------------------------------------------------------------------------
alter table public.vehicle_types enable row level security;

drop policy if exists vehicle_types_select_authenticated on public.vehicle_types;
create policy vehicle_types_select_authenticated on public.vehicle_types
  for select using (auth.role() = 'authenticated');

drop policy if exists vehicle_types_write_admin on public.vehicle_types;
create policy vehicle_types_write_admin on public.vehicle_types
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- RLS: promotions — ai đăng nhập cũng đọc được, chỉ admin ghi
-- ---------------------------------------------------------------------------
drop policy if exists promotions_select_authenticated on public.promotions;
create policy promotions_select_authenticated on public.promotions
  for select using (auth.role() = 'authenticated');

drop policy if exists promotions_write_admin on public.promotions;
create policy promotions_write_admin on public.promotions
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- RLS: addresses — chủ sở hữu tự CRUD, admin đọc tất cả
-- ---------------------------------------------------------------------------
drop policy if exists addresses_select_own on public.addresses;
create policy addresses_select_own on public.addresses
  for select using (owner_id = auth.uid());

drop policy if exists addresses_select_admin on public.addresses;
create policy addresses_select_admin on public.addresses
  for select using (public.is_admin());

drop policy if exists addresses_insert_own on public.addresses;
create policy addresses_insert_own on public.addresses
  for insert with check (owner_id = auth.uid());

drop policy if exists addresses_update_own on public.addresses;
create policy addresses_update_own on public.addresses
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists addresses_delete_own on public.addresses;
create policy addresses_delete_own on public.addresses
  for delete using (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- RLS: drivers — cho phép admin UPDATE (vd. duyệt hồ sơ), ngoài select đã có
-- từ Giai đoạn 1
-- ---------------------------------------------------------------------------
drop policy if exists drivers_update_admin on public.drivers;
create policy drivers_update_admin on public.drivers
  for update using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- RLS: profiles — admin cần đọc được để hiển thị danh sách khách hàng
-- (đã có profiles_select_admin từ Giai đoạn 1, không cần thêm)
-- ---------------------------------------------------------------------------

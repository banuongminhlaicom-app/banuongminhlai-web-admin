-- Giai đoạn 26: RLS cho bảng vehicles — bảng đã có sẵn từ init_schema.sql
-- (cột id/owner_id/name/plate/type/gearbox/note/created_at) và đã bật RLS
-- ngay từ đầu, nhưng CHƯA TỪNG có policy nào (mặc định chặn hết mọi truy
-- vấn) — web cũng chưa bao giờ gọi bảng này thật (vehicles.tsx bên web chỉ
-- hiện 2 xe mẫu viết cứng, không có Supabase call). Theo đúng pattern
-- addresses_*_own đã có (stage2_catalog_and_policies.sql). Idempotent.

drop policy if exists vehicles_select_own on public.vehicles;
create policy vehicles_select_own on public.vehicles
  for select using (owner_id = auth.uid());

drop policy if exists vehicles_select_admin on public.vehicles;
create policy vehicles_select_admin on public.vehicles
  for select using (public.is_admin());

drop policy if exists vehicles_insert_own on public.vehicles;
create policy vehicles_insert_own on public.vehicles
  for insert with check (owner_id = auth.uid());

drop policy if exists vehicles_update_own on public.vehicles;
create policy vehicles_update_own on public.vehicles
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists vehicles_delete_own on public.vehicles;
create policy vehicles_delete_own on public.vehicles
  for delete using (owner_id = auth.uid());

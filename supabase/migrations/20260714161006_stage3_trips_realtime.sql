-- Giai đoạn 3: RLS cho trips + bật Realtime để booking.$id.tsx nghe cập nhật
-- trạng thái trực tiếp từ DB. Idempotent.

-- ---------------------------------------------------------------------------
-- RLS: trips
-- LƯU Ý: trips_update_own_customer hiện cho phép khách tự cập nhật status
-- chuyến của chính mình — đây là giải pháp TẠM THỜI của Giai đoạn 3 vì chưa
-- có tài xế thật ở đầu bên kia (nút "mô phỏng bước tiếp theo" cần ghi được).
-- Giai đoạn 4 (dispatch tài xế thật) PHẢI siết lại policy này: chỉ tài xế
-- được cập nhật status/driver_id, khách chỉ được phép huỷ (status=cancelled).
-- ---------------------------------------------------------------------------
drop policy if exists trips_select_own_customer on public.trips;
create policy trips_select_own_customer on public.trips
  for select using (customer_id = auth.uid());

drop policy if exists trips_select_own_driver on public.trips;
create policy trips_select_own_driver on public.trips
  for select using (driver_id = auth.uid());

drop policy if exists trips_select_admin on public.trips;
create policy trips_select_admin on public.trips
  for select using (public.is_admin());

drop policy if exists trips_insert_own_customer on public.trips;
create policy trips_insert_own_customer on public.trips
  for insert with check (customer_id = auth.uid());

drop policy if exists trips_update_own_customer on public.trips;
create policy trips_update_own_customer on public.trips
  for update using (customer_id = auth.uid()) with check (customer_id = auth.uid());

drop policy if exists trips_update_admin on public.trips;
create policy trips_update_admin on public.trips
  for update using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Realtime: thêm trips vào publication để Postgres Changes hoạt động
-- ---------------------------------------------------------------------------
do $$ begin
  alter publication supabase_realtime add table public.trips;
exception when duplicate_object then null;
end $$;

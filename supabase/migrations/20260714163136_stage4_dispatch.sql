-- Giai đoạn 4: dispatch tự động (khớp chuyến "searching" với tài xế online
-- rảnh gần nhất — GIỚI HẠN: chưa có toạ độ GPS thật nên "gần nhất" ở đây chỉ
-- là "tài xế online lâu nhất chưa có chuyến", không phải khoảng cách thật).
-- Siết lại RLS trips: khách chỉ được cập nhật để huỷ chuyến của mình, việc
-- đẩy trạng thái chuyến giờ thuộc về tài xế được gán. Idempotent.

-- ---------------------------------------------------------------------------
-- RLS: siết trips_update_own_customer, thêm trips_update_own_driver
-- ---------------------------------------------------------------------------
drop policy if exists trips_update_own_customer on public.trips;
create policy trips_update_own_customer on public.trips
  for update
  using (customer_id = auth.uid())
  with check (customer_id = auth.uid() and status = 'cancelled');

drop policy if exists trips_update_own_driver on public.trips;
create policy trips_update_own_driver on public.trips
  for update
  using (driver_id = auth.uid())
  with check (driver_id = auth.uid() or driver_id is null);

-- ---------------------------------------------------------------------------
-- RLS: cho phép tài xế đọc hồ sơ (tên/SĐT) của khách trong chuyến đang được
-- gán cho mình, để hiển thị trên driver.trips.$id.tsx.
-- ---------------------------------------------------------------------------
drop policy if exists profiles_select_customer_for_assigned_driver on public.profiles;
create policy profiles_select_customer_for_assigned_driver on public.profiles
  for select using (
    exists (
      select 1 from public.trips
      where trips.customer_id = profiles.id
        and trips.driver_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- RLS: ngược lại — cho phép khách đọc hồ sơ + thông tin nghiệp vụ (rating,
-- số chuyến...) của tài xế đang được gán cho chuyến của mình.
-- ---------------------------------------------------------------------------
drop policy if exists profiles_select_driver_for_assigned_customer on public.profiles;
create policy profiles_select_driver_for_assigned_customer on public.profiles
  for select using (
    exists (
      select 1 from public.trips
      where trips.driver_id = profiles.id
        and trips.customer_id = auth.uid()
    )
  );

drop policy if exists drivers_select_for_assigned_customer on public.drivers;
create policy drivers_select_for_assigned_customer on public.drivers
  for select using (
    exists (
      select 1 from public.trips
      where trips.driver_id = drivers.id
        and trips.customer_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Gán 1 tài xế đang online + đã duyệt + đang rảnh cho 1 chuyến cụ thể.
-- SECURITY DEFINER vì cần ghi vào hàng `drivers` của người khác (khách/tài xế
-- gọi hàm này không có quyền UPDATE bảng drivers của tài xế khác qua RLS).
-- ---------------------------------------------------------------------------
create or replace function public.try_assign_driver_to_trip(p_trip_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_driver_id uuid;
begin
  select id into v_driver_id
  from public.drivers
  where online = true and approved = true and current_trip_id is null
  order by online_since asc nulls last
  for update skip locked
  limit 1;

  if v_driver_id is null then
    return;
  end if;

  update public.trips set driver_id = v_driver_id where id = p_trip_id and driver_id is null;
  if found then
    update public.drivers set current_trip_id = p_trip_id, status = 'assigned' where id = v_driver_id;
  end if;
end;
$$;

grant execute on function public.try_assign_driver_to_trip(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Gán 1 chuyến đang "searching" chưa có tài xế cho 1 tài xế cụ thể vừa online.
-- ---------------------------------------------------------------------------
create or replace function public.try_assign_trip_to_driver(p_driver_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trip_id uuid;
begin
  select id into v_trip_id
  from public.trips
  where status = 'searching' and driver_id is null
  order by created_at asc
  for update skip locked
  limit 1;

  if v_trip_id is null then
    return;
  end if;

  update public.trips set driver_id = p_driver_id where id = v_trip_id and driver_id is null;
  if found then
    update public.drivers set current_trip_id = v_trip_id, status = 'assigned' where id = p_driver_id and current_trip_id is null;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Trigger: khi có chuyến mới ở trạng thái "searching" -> thử gán ngay
-- ---------------------------------------------------------------------------
create or replace function public.trips_after_insert_assign()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'searching' then
    perform public.try_assign_driver_to_trip(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists trips_assign_on_insert on public.trips;
create trigger trips_assign_on_insert
  after insert on public.trips
  for each row execute function public.trips_after_insert_assign();

-- ---------------------------------------------------------------------------
-- Trigger: khi tài xế chuyển sang online mà đang rảnh -> thử nhận 1 chuyến
-- đang chờ
-- ---------------------------------------------------------------------------
create or replace function public.drivers_after_online_assign()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.online = true and coalesce(old.online, false) = false and new.current_trip_id is null then
    perform public.try_assign_trip_to_driver(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists drivers_assign_on_online on public.drivers;
create trigger drivers_assign_on_online
  after update on public.drivers
  for each row execute function public.drivers_after_online_assign();

-- ---------------------------------------------------------------------------
-- Realtime: thêm drivers vào publication để driver.index.tsx nghe được lúc
-- trigger tự gán chuyến (current_trip_id/status đổi từ phía server).
-- ---------------------------------------------------------------------------
do $$ begin
  alter publication supabase_realtime add table public.drivers;
exception when duplicate_object then null;
end $$;

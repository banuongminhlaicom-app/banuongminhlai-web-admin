-- Vá lỗi: khách huỷ chuyến đã gán tài xế làm tài xế bị KẸT VĨNH VIỄN.
--
-- cancelTrip() (booking_.$id.tsx, booking_.searching.tsx) chỉ cập nhật bảng
-- trips (status='cancelled'), không đụng tới bảng drivers. Nếu chuyến đó đã
-- được gán cho 1 tài xế (driver_id + current_trip_id đã set), tài xế bị kẹt
-- ở current_trip_id trỏ vào chuyến đã huỷ — hệ thống coi họ "đang bận" mãi
-- mãi, không bao giờ được gán chuyến mới nữa, kể cả tắt/bật online lại.
--
-- Khách không có quyền UPDATE bảng drivers (đúng, không nên cho) nên phải xử
-- lý bằng trigger SECURITY DEFINER, giống cách trips_after_insert_assign và
-- drivers_after_online_assign đã làm ở Giai đoạn 4. File idempotent.

-- ---------------------------------------------------------------------------
-- Dọn dẹp 1 lần: giải phóng các tài xế đang bị kẹt bởi lỗi này từ trước.
-- ---------------------------------------------------------------------------
update public.drivers d
set current_trip_id = null,
    status = case when d.online then 'online' else 'offline' end::driver_status
where d.current_trip_id is not null
  and exists (
    select 1 from public.trips t
    where t.id = d.current_trip_id and t.status in ('cancelled', 'completed')
  );

-- ---------------------------------------------------------------------------
-- Trigger: chuyến chuyển sang cancelled/completed -> giải phóng tài xế đang
-- gán (nếu có), rồi thử gán ngay cho 1 chuyến khác đang chờ (tận dụng luôn,
-- giống hành vi khi tài xế mới bật online).
-- ---------------------------------------------------------------------------
create or replace function public.trips_free_driver_on_end()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('cancelled', 'completed')
     and old.status not in ('cancelled', 'completed')
     and new.driver_id is not null then
    update public.drivers
    set current_trip_id = null,
        status = case when online then 'online' else 'offline' end::driver_status
    where id = new.driver_id and current_trip_id = new.id;

    if found then
      perform public.try_assign_trip_to_driver(new.driver_id);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trips_free_driver_on_end_trigger on public.trips;
create trigger trips_free_driver_on_end_trigger
  after update on public.trips
  for each row execute function public.trips_free_driver_on_end();

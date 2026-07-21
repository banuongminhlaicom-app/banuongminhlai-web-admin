-- Vá lỗi: ghép chuyến chỉ chọn "tài xế online lâu nhất", không xét khoảng
-- cách tới điểm đón. Hậu quả thật: tài xế đang ở Cao Lãnh vẫn được gán chuyến
-- đón khách ở TP.HCM (cách hơn 100km), trong khi UI đã ghi "bán kính 5km".
--
-- Sửa: thêm hàm tính khoảng cách (haversine) và lọc tài xế trong bán kính
-- BOOKING_RADIUS_KM quanh điểm đón, ưu tiên tài xế GẦN NHẤT trước (thay vì
-- chỉ "online lâu nhất"). Nếu chuyến/tài xế thiếu toạ độ (geocode lỗi, tài xế
-- chưa từng gửi GPS) thì rơi về hành vi cũ (không lọc khoảng cách) để không
-- chặn hoàn toàn việc ghép chuyến. File idempotent.

create or replace function public.distance_km(
  lat1 double precision, lng1 double precision,
  lat2 double precision, lng2 double precision
) returns double precision
language sql
immutable
as $$
  select 6371 * acos(
    least(1, greatest(-1,
      cos(radians(lat1)) * cos(radians(lat2)) * cos(radians(lng2) - radians(lng1))
      + sin(radians(lat1)) * sin(radians(lat2))
    ))
  );
$$;

-- ---------------------------------------------------------------------------
-- Gán 1 tài xế đang online + đã duyệt + đang rảnh + TRONG BÁN KÍNH cho 1
-- chuyến cụ thể. Ưu tiên tài xế gần điểm đón nhất.
-- ---------------------------------------------------------------------------
create or replace function public.try_assign_driver_to_trip(p_trip_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_driver_id uuid;
  v_pickup_lat double precision;
  v_pickup_lng double precision;
  v_radius_km constant double precision := 5;
begin
  select pickup_lat, pickup_lng into v_pickup_lat, v_pickup_lng
  from public.trips where id = p_trip_id;

  select id into v_driver_id
  from public.drivers
  where online = true and approved = true and current_trip_id is null
    and (
      v_pickup_lat is null or v_pickup_lng is null
      or (
        current_lat is not null and current_lng is not null
        and public.distance_km(current_lat, current_lng, v_pickup_lat, v_pickup_lng) <= v_radius_km
      )
    )
  order by
    case
      when v_pickup_lat is null or v_pickup_lng is null or current_lat is null or current_lng is null then null
      else public.distance_km(current_lat, current_lng, v_pickup_lat, v_pickup_lng)
    end asc nulls last,
    online_since asc nulls last
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

-- ---------------------------------------------------------------------------
-- Gán 1 chuyến đang "searching" TRONG BÁN KÍNH cho 1 tài xế cụ thể vừa rảnh
-- (vừa online, hoặc vừa được giải phóng khỏi chuyến trước).
-- ---------------------------------------------------------------------------
create or replace function public.try_assign_trip_to_driver(p_driver_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trip_id uuid;
  v_driver_lat double precision;
  v_driver_lng double precision;
  v_radius_km constant double precision := 5;
begin
  select current_lat, current_lng into v_driver_lat, v_driver_lng
  from public.drivers where id = p_driver_id;

  select id into v_trip_id
  from public.trips
  where status = 'searching' and driver_id is null
    and (
      pickup_lat is null or pickup_lng is null
      or v_driver_lat is null or v_driver_lng is null
      or public.distance_km(v_driver_lat, v_driver_lng, pickup_lat, pickup_lng) <= v_radius_km
    )
  order by
    case
      when pickup_lat is null or pickup_lng is null or v_driver_lat is null or v_driver_lng is null then null
      else public.distance_km(v_driver_lat, v_driver_lng, pickup_lat, pickup_lng)
    end asc nulls last,
    created_at asc
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

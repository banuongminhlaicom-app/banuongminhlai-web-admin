-- Giai đoạn 27: "Đặt lịch trước" hoạt động thật — trước đây cả web
-- (schedule.tsx) lẫn mobile (CustomerScheduleScreen.tsx) chỉ là form UI,
-- bấm xác nhận chỉ hiện toast, không lưu gì, không có cơ chế tự tìm tài xế
-- trước giờ hẹn dù UI đã ghi rõ hint "tự động tìm tài xế trước giờ hẹn 30
-- phút". Toàn bộ cơ chế gán tài xế hiện tại chạy 100% bằng Postgres trigger
-- (insert vào trips -> trips_assign_on_insert -> try_assign_driver_to_trip,
-- xem stage4/stage7d) — không có cron/polling nào trong hệ thống. Thiết kế
-- ở đây: bảng scheduled_trips mới + pg_cron chạy mỗi phút để "kích hoạt"
-- chuyến đã tới hạn thành 1 dòng trips thật, tận dụng nguyên cơ chế dispatch
-- có sẵn, KHÔNG sửa gì ở try_assign_driver_to_trip/trigger đó. File
-- idempotent.

create extension if not exists pg_cron;

-- ---------------------------------------------------------------------------
-- scheduled_trips: y hệt các field form đặt lịch trước đã có ở
-- CustomerScheduleScreen.tsx/schedule.tsx, cộng price/distance_km/
-- duration_min TÍNH SẴN lúc khách đặt lịch (client gọi fetchRoute() + công
-- thức giá y hệt BookingScreen.tsx đang làm) — vì trips.price/trips.code đều
-- not null, không thể để cron tính lại giá bằng SQL (tránh viết công thức
-- giá 2 lần ở 2 ngôn ngữ).
-- ---------------------------------------------------------------------------
create table if not exists public.scheduled_trips (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id) on delete cascade,
  pickup_address text not null,
  pickup_lat double precision not null,
  pickup_lng double precision not null,
  dropoff_address text not null,
  dropoff_lat double precision not null,
  dropoff_lng double precision not null,
  distance_km numeric(6, 2),
  duration_min numeric(6, 1),
  vehicle_type text not null,
  payment_method public.payment_method not null default 'cash',
  price numeric(12, 0) not null check (price > 0),
  note text,
  scheduled_for timestamptz not null,
  lead_minutes integer not null default 30 check (lead_minutes >= 0),
  status text not null default 'pending' check (status in ('pending', 'converted', 'cancelled')),
  converted_trip_id uuid references public.trips (id),
  created_at timestamptz not null default now()
);

comment on table public.scheduled_trips is
  'Đặt xe trước cho 1 thời điểm trong tương lai — pg_cron (activate_due_scheduled_trips) tự chuyển thành 1 dòng trips thật khi tới hạn (scheduled_for trừ lead_minutes).';

create index if not exists scheduled_trips_customer_idx on public.scheduled_trips (customer_id, created_at desc);
create index if not exists scheduled_trips_pending_due_idx on public.scheduled_trips (scheduled_for) where status = 'pending';

alter table public.scheduled_trips enable row level security;

drop policy if exists scheduled_trips_select_own on public.scheduled_trips;
create policy scheduled_trips_select_own on public.scheduled_trips
  for select using (customer_id = auth.uid());

drop policy if exists scheduled_trips_select_admin on public.scheduled_trips;
create policy scheduled_trips_select_admin on public.scheduled_trips
  for select using (public.is_admin());

drop policy if exists scheduled_trips_insert_own on public.scheduled_trips;
create policy scheduled_trips_insert_own on public.scheduled_trips
  for insert with check (customer_id = auth.uid() and status = 'pending');

-- Không có policy update/delete cho customer — huỷ chuyến phải qua RPC
-- cancel_scheduled_trip() bên dưới (giống pattern request_driver_payout/
-- wallet_topup: ghi có kiểm soát qua hàm, không cho UPDATE thẳng bảng), để
-- khách không tự sửa được status thành 'converted' hay đổi customer_id.

do $$ begin
  alter publication supabase_realtime add table public.scheduled_trips;
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Khách tự huỷ chuyến đã đặt lịch — chỉ khi còn 'pending'.
-- ---------------------------------------------------------------------------
create or replace function public.cancel_scheduled_trip(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.scheduled_trips
    set status = 'cancelled'
    where id = p_id and customer_id = auth.uid() and status = 'pending';

  if not found then
    raise exception 'Không tìm thấy chuyến đã đặt lịch (đang chờ) để huỷ.';
  end if;
end;
$$;

grant execute on function public.cancel_scheduled_trip(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Cron job (mỗi phút): chuyển các scheduled_trips đã tới hạn thành 1 dòng
-- trips thật (status mặc định 'searching' -> tự kích hoạt trigger dispatch
-- có sẵn). Bọc riêng từng dòng trong BEGIN/EXCEPTION để 1 lần trùng mã
-- (code, xác suất cực thấp: 9000 mã khả dĩ, cùng cách sinh mã ngẫu nhiên
-- generateTripCode() phía client) không làm hỏng cả batch — dòng lỗi sẽ thử
-- lại ở lượt cron kế tiếp (còn nguyên 'pending').
-- ---------------------------------------------------------------------------
create or replace function public.activate_due_scheduled_trips()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_trip_id uuid;
  v_code text;
begin
  for r in
    select * from public.scheduled_trips
    where status = 'pending'
      and now() >= scheduled_for - (lead_minutes || ' minutes')::interval
    order by scheduled_for asc
    for update skip locked
  loop
    begin
      v_code := 'BUML-' || (1000 + floor(random() * 9000))::int;

      insert into public.trips (
        code, customer_id, pickup_address, pickup_lat, pickup_lng,
        dropoff_address, dropoff_lat, dropoff_lng, distance_km, duration_min,
        vehicle_type, payment_method, price, note, status, scheduled_at
      ) values (
        v_code, r.customer_id, r.pickup_address, r.pickup_lat, r.pickup_lng,
        r.dropoff_address, r.dropoff_lat, r.dropoff_lng, r.distance_km, r.duration_min,
        r.vehicle_type, r.payment_method, r.price, r.note, 'searching', r.scheduled_for
      ) returning id into v_trip_id;

      update public.scheduled_trips
        set status = 'converted', converted_trip_id = v_trip_id
        where id = r.id;
    exception when unique_violation then
      -- Trùng mã trips.code — bỏ qua, thử lại ở lượt cron kế tiếp (còn 'pending').
      continue;
    end;
  end loop;
end;
$$;

select cron.schedule(
  'activate-scheduled-trips',
  '* * * * *',
  $$select public.activate_due_scheduled_trips();$$
) where not exists (select 1 from cron.job where jobname = 'activate-scheduled-trips');

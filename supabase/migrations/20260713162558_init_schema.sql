-- Giai đoạn 0: schema khởi tạo cho Bạn Uống Mình Lái.
-- Đặt tên bảng/cột khớp với các type TS hiện có (src/lib/mock.ts, pricing.ts, driver-store.ts)
-- để các giai đoạn sau map dữ liệu 1-1 mà không phải đổi UI.
-- RLS được bật trên mọi bảng nhưng CHƯA có policy nào — mặc định khoá hết,
-- các giai đoạn sau (gắn Auth thật) sẽ thêm policy tương ứng với từng vai trò.
--
-- File này idempotent: chạy lại nhiều lần (kể cả sau khi lần trước lỗi giữa chừng)
-- đều an toàn, không văng lỗi "already exists".

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- ENUM types (khớp TripStatus / DriverStatus trong src/lib/mock.ts, driver-store.ts)
-- Postgres không hỗ trợ `create type if not exists` nên bọc bằng DO block.
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.user_role as enum ('customer', 'driver', 'admin');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.trip_status as enum (
    'searching',
    'accepted',
    'arriving',
    'arrived',
    'in_progress',
    'completed',
    'cancelled'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.driver_status as enum (
    'offline',
    'online',
    'assigned',
    'going_to_pickup',
    'arrived',
    'met_customer',
    'in_progress',
    'completed'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.payment_method as enum ('cash', 'transfer', 'qr');
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- profiles: 1 hàng / auth.users, phân vai trò customer | driver | admin
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'customer',
  full_name text,
  phone text unique,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Hồ sơ người dùng, mở rộng auth.users. role phân biệt customer/driver/admin.';

-- ---------------------------------------------------------------------------
-- drivers: hồ sơ nghiệp vụ tài xế (1-1 với profiles có role=driver)
-- Khớp DriverState trong src/lib/driver-store.ts
-- ---------------------------------------------------------------------------
create table if not exists public.drivers (
  id uuid primary key references public.profiles (id) on delete cascade,
  rating numeric(3, 2) not null default 5.0,
  trips_count integer not null default 0,
  years_experience integer not null default 0,
  vehicle_class text,
  online boolean not null default false,
  auto_accept boolean not null default true,
  status public.driver_status not null default 'offline',
  online_since timestamptz,
  today_trips integer not null default 0,
  today_revenue numeric(12, 0) not null default 0,
  current_trip_id uuid,
  updated_at timestamptz not null default now()
);

comment on table public.drivers is 'Hồ sơ nghiệp vụ + trạng thái realtime của tài xế.';

-- ---------------------------------------------------------------------------
-- vehicles: phương tiện của khách hàng hoặc tài xế
-- Khớp SavedVehicle trong src/routes/booking.tsx
-- ---------------------------------------------------------------------------
create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  plate text not null,
  type text not null,
  gearbox text not null check (gearbox in ('auto', 'manual')),
  note text,
  created_at timestamptz not null default now()
);

comment on table public.vehicles is 'Xe của khách hàng (đăng ký để tài xế lái hộ) hoặc xe tài xế đang chạy.';

-- ---------------------------------------------------------------------------
-- pricing_rules: bảng giá theo khu vực. Khớp PricingRule trong src/lib/pricing.ts
-- ---------------------------------------------------------------------------
create table if not exists public.pricing_rules (
  id uuid primary key default gen_random_uuid(),
  region text not null unique,
  opening_fee numeric(12, 0) not null,
  minimum_price numeric(12, 0) not null,
  first_distance_limit numeric(6, 2) not null,
  first_distance_price numeric(12, 0) not null,
  price_per_extra_km numeric(12, 0) not null,
  waiting_price_per_minute numeric(12, 0) not null,
  night_surcharge_percent numeric(5, 2) not null,
  night_start_hour smallint not null,
  night_end_hour smallint not null,
  updated_at timestamptz not null default now()
);

comment on table public.pricing_rules is 'Bảng giá theo khu vực, tương ứng DEFAULT_PRICING trong src/lib/pricing.ts.';

-- ---------------------------------------------------------------------------
-- promotions: khớp Promotion trong src/lib/mock.ts
-- ---------------------------------------------------------------------------
create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  description text,
  discount numeric(12, 0) not null,
  expires_at date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.promotions is 'Mã khuyến mãi dùng ở booking.tsx / admin.promotions.tsx.';

-- ---------------------------------------------------------------------------
-- promotion_redemptions: theo dõi khách nào đã dùng mã nào (thay cho field `used` phẳng)
-- ---------------------------------------------------------------------------
create table if not exists public.promotion_redemptions (
  id uuid primary key default gen_random_uuid(),
  promotion_id uuid not null references public.promotions (id) on delete cascade,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  trip_id uuid,
  redeemed_at timestamptz not null default now(),
  unique (promotion_id, customer_id, trip_id)
);

-- ---------------------------------------------------------------------------
-- addresses: khớp SAVED_ADDRESSES trong src/lib/mock.ts
-- ---------------------------------------------------------------------------
create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  label text not null,
  address text not null,
  icon text,
  created_at timestamptz not null default now()
);

comment on table public.addresses is 'Địa chỉ đã lưu của khách hàng.';

-- ---------------------------------------------------------------------------
-- trips: khớp Trip trong src/lib/mock.ts + DriverTrip trong driver-store.ts
-- ---------------------------------------------------------------------------
create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  customer_id uuid not null references public.profiles (id),
  driver_id uuid references public.profiles (id),
  vehicle_id uuid references public.vehicles (id),
  pickup_address text not null,
  pickup_lat double precision,
  pickup_lng double precision,
  dropoff_address text not null,
  dropoff_lat double precision,
  dropoff_lng double precision,
  distance_km numeric(6, 2),
  duration_min numeric(6, 1),
  vehicle_type text not null,
  payment_method public.payment_method not null default 'cash',
  price numeric(12, 0) not null,
  promotion_id uuid references public.promotions (id),
  note text,
  status public.trip_status not null default 'searching',
  pin char(4),
  scheduled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  customer_rating smallint check (customer_rating between 1 and 5),
  customer_feedback text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.trips is 'Chuyến đi — nguồn sự thật dùng chung giữa app khách hàng và app tài xế (đồng bộ qua Realtime ở giai đoạn 3).';

do $$ begin
  alter table public.drivers
    add constraint drivers_current_trip_fkey
    foreign key (current_trip_id) references public.trips (id) on delete set null;
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- notifications: khớp AppNotification trong src/lib/mock.ts
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  content text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

comment on table public.notifications is 'Thông báo trong app cho khách hàng và tài xế.';

-- ---------------------------------------------------------------------------
-- Indexes phục vụ các truy vấn phổ biến ở admin dashboard / lịch sử chuyến
-- ---------------------------------------------------------------------------
create index if not exists trips_customer_id_idx on public.trips (customer_id);
create index if not exists trips_driver_id_idx on public.trips (driver_id);
create index if not exists trips_status_idx on public.trips (status);
create index if not exists trips_created_at_idx on public.trips (created_at desc);
create index if not exists drivers_online_idx on public.drivers (online) where online = true;
create index if not exists notifications_owner_id_idx on public.notifications (owner_id, read);
create index if not exists addresses_owner_id_idx on public.addresses (owner_id);

-- ---------------------------------------------------------------------------
-- updated_at auto-touch trigger dùng chung
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create or replace trigger drivers_set_updated_at before update on public.drivers
  for each row execute function public.set_updated_at();
create or replace trigger pricing_rules_set_updated_at before update on public.pricing_rules
  for each row execute function public.set_updated_at();
create or replace trigger trips_set_updated_at before update on public.trips
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: bật trên toàn bộ bảng, CHƯA thêm policy (khoá mặc định).
-- Giai đoạn 1 (Auth thật) sẽ thêm policy theo role trong migration riêng.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.drivers enable row level security;
alter table public.vehicles enable row level security;
alter table public.pricing_rules enable row level security;
alter table public.promotions enable row level security;
alter table public.promotion_redemptions enable row level security;
alter table public.addresses enable row level security;
alter table public.trips enable row level security;
alter table public.notifications enable row level security;

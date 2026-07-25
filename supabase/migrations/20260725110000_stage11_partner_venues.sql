-- "Địa điểm nhậu gần đây" trên Home: đây là banner quảng cáo TRẢ PHÍ cho đối
-- tác quán nhậu/nhà hàng (admin tự thêm/quản lý qua admin.venues.tsx), KHÔNG
-- phải quét tự động theo GPS như bản nháp trước đó (đã bỏ vì Goong không có
-- ảnh/rating/giờ mở cửa thật). Bấm vào 1 thẻ sẽ điền sẵn địa điểm đó làm điểm
-- đến trong /booking. File idempotent.

create table if not exists public.partner_venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  lat double precision not null,
  lng double precision not null,
  image_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.partner_venues is
  'Quán nhậu/nhà hàng đối tác trả phí quảng cáo, hiện ở khối "Địa điểm nhậu gần đây" trên Home.';

alter table public.partner_venues enable row level security;

drop policy if exists partner_venues_select_authenticated on public.partner_venues;
create policy partner_venues_select_authenticated on public.partner_venues
  for select using (auth.role() = 'authenticated');

drop policy if exists partner_venues_write_admin on public.partner_venues;
create policy partner_venues_write_admin on public.partner_venues
  for all using (public.is_admin()) with check (public.is_admin());

-- Bucket ảnh — cùng kiểu public bucket như promotion-banners.
insert into storage.buckets (id, name, public)
values ('partner-venues', 'partner-venues', true)
on conflict (id) do nothing;

drop policy if exists partner_venues_images_select_public on storage.objects;
create policy partner_venues_images_select_public on storage.objects
  for select using (bucket_id = 'partner-venues');

drop policy if exists partner_venues_images_write_admin on storage.objects;
create policy partner_venues_images_write_admin on storage.objects
  for all using (bucket_id = 'partner-venues' and public.is_admin())
  with check (bucket_id = 'partner-venues' and public.is_admin());

-- Ảnh banner cho khuyến mãi: khách muốn khối "Ưu đãi" ở Home hiện ảnh quảng
-- cáo tự thiết kế (kiểu Mioto/MiCarro) thay vì khung gradient + chữ, gắn với
-- mã khuyến mãi thật trong bảng promotions (không phải ảnh tĩnh tách rời).
-- File idempotent.

alter table public.promotions add column if not exists image_url text;
comment on column public.promotions.image_url is
  'Ảnh banner quảng cáo cho mã này (upload qua admin.promotions.tsx, lưu ở bucket promotion-banners). NULL thì Home rơi về khung gradient + chữ như trước.';

-- Bucket public để ảnh load thẳng qua URL công khai (không cần signed URL) —
-- ảnh quảng cáo không phải dữ liệu nhạy cảm nên public là hợp lý.
insert into storage.buckets (id, name, public)
values ('promotion-banners', 'promotion-banners', true)
on conflict (id) do nothing;

drop policy if exists promotion_banners_select_public on storage.objects;
create policy promotion_banners_select_public on storage.objects
  for select using (bucket_id = 'promotion-banners');

-- Chỉ admin được tải lên/xoá/đổi ảnh — dùng public.is_admin() có sẵn từ
-- stage1_auth_policies.sql, tránh viết lại điều kiện kiểm tra role.
drop policy if exists promotion_banners_write_admin on storage.objects;
create policy promotion_banners_write_admin on storage.objects
  for all using (bucket_id = 'promotion-banners' and public.is_admin())
  with check (bucket_id = 'promotion-banners' and public.is_admin());

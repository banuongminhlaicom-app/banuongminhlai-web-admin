-- Giấy tờ tài xế (CCCD, GPLX, người liên hệ khẩn cấp...) ở driver.profile.tsx
-- trước đây toàn dữ liệu giả cứng trong code. Thêm cột lưu thật vào drivers +
-- bucket RIÊNG, PRIVATE (khác avatars) vì đây là ảnh giấy tờ tuỳ thân nhạy
-- cảm — chỉ chính chủ tài xế và admin xem được, qua signed URL tạo theo yêu
-- cầu thay vì URL công khai. File idempotent.

alter table public.drivers add column if not exists id_number text;
alter table public.drivers add column if not exists id_photo_path text;
alter table public.drivers add column if not exists license_class text;
alter table public.drivers add column if not exists license_expiry date;
alter table public.drivers add column if not exists license_photo_path text;
alter table public.drivers add column if not exists emergency_contact_name text;
alter table public.drivers add column if not exists emergency_contact_phone text;

insert into storage.buckets (id, name, public)
values ('driver-docs', 'driver-docs', false)
on conflict (id) do nothing;

-- Đọc: chính chủ (thư mục đầu = uid) hoặc admin (xét duyệt hồ sơ).
drop policy if exists driver_docs_select_own_or_admin on storage.objects;
create policy driver_docs_select_own_or_admin on storage.objects
  for select using (
    bucket_id = 'driver-docs'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

-- Ghi/xoá/đổi: chỉ chính chủ.
drop policy if exists driver_docs_write_own on storage.objects;
create policy driver_docs_write_own on storage.objects
  for all using (bucket_id = 'driver-docs' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'driver-docs' and (storage.foldername(name))[1] = auth.uid()::text);

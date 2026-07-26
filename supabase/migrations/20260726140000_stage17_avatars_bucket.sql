-- Ảnh đại diện cho khách hàng + tài xế (profile.tsx / driver.profile.tsx),
-- ghi vào profiles.avatar_url (cột có sẵn từ init_schema.sql, trước đây chưa
-- dùng). Bucket public để load thẳng qua URL, không cần signed URL — ảnh đại
-- diện không phải dữ liệu nhạy cảm. Path bắt buộc dạng <user_id>/... để RLS
-- phân biệt chủ sở hữu theo tên thư mục đầu tiên. File idempotent.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists avatars_select_public on storage.objects;
create policy avatars_select_public on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists avatars_write_own on storage.objects;
create policy avatars_write_own on storage.objects
  for all using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

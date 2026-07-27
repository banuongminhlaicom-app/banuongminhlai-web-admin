-- Cho phép ADMIN tự bổ sung 2 loại giấy tờ vào hồ sơ tài xế (không phải tài
-- xế tự nộp): hạnh kiểm xác nhận địa phương + lý lịch tư pháp. Lưu chung
-- bucket driver-docs (stage18) — nới quyền ghi cho admin (trước chỉ chính
-- chủ ghi được). File idempotent.

alter table public.drivers add column if not exists conduct_cert_path text;
alter table public.drivers add column if not exists background_check_path text;

drop policy if exists driver_docs_write_own on storage.objects;
create policy driver_docs_write_own on storage.objects
  for all using (
    bucket_id = 'driver-docs'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  )
  with check (
    bucket_id = 'driver-docs'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

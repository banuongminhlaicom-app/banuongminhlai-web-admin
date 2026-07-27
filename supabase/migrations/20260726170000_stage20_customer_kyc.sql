-- eKYC thủ công cho KHÁCH HÀNG (song song với driver-docs ở stage18): nộp
-- CCCD mặt trước/sau để admin đối chiếu. Khách không cần GPLX/selfie riêng
-- như tài xế — phạm vi chỉ CCCD. Lưu path (không phải URL) trực tiếp trên
-- profiles vì khách không có bảng nghiệp vụ riêng như drivers. File idempotent.

alter table public.profiles add column if not exists id_number text;
alter table public.profiles add column if not exists id_photo_path text;
alter table public.profiles add column if not exists id_photo_back_path text;

insert into storage.buckets (id, name, public)
values ('customer-docs', 'customer-docs', false)
on conflict (id) do nothing;

-- Đọc: chính chủ (thư mục đầu = uid) hoặc admin (xét duyệt hồ sơ).
drop policy if exists customer_docs_select_own_or_admin on storage.objects;
create policy customer_docs_select_own_or_admin on storage.objects
  for select using (
    bucket_id = 'customer-docs'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

-- Ghi/xoá/đổi: chỉ chính chủ.
drop policy if exists customer_docs_write_own on storage.objects;
create policy customer_docs_write_own on storage.objects
  for all using (bucket_id = 'customer-docs' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'customer-docs' and (storage.foldername(name))[1] = auth.uid()::text);

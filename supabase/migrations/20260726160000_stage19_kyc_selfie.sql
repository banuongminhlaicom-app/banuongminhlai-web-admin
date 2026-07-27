-- eKYC thủ công: bổ sung mặt sau CCCD/GPLX + ảnh chân dung (selfie) để admin
-- đối chiếu bằng mắt khi duyệt hồ sơ tài xế. Storage RLS ở stage18 đã cho
-- phép mọi path trong thư mục <uid>/ nên không cần policy mới, chỉ thêm cột.
-- File idempotent.

alter table public.drivers add column if not exists id_photo_back_path text;
alter table public.drivers add column if not exists license_photo_back_path text;
alter table public.drivers add column if not exists selfie_path text;

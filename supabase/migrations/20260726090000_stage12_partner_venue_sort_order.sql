-- Cho phép admin tự sắp xếp thứ tự hiển thị "Địa điểm gần bạn" trên Home,
-- thay vì luôn cố định theo thứ tự tạo mới nhất trước.
-- sort_order CÀNG CAO thì hiện càng trước (desc). Địa điểm mới tạo mặc định
-- sort_order = 0 nên rơi xuống cuối danh sách, không tự nhảy lên đầu.

alter table public.partner_venues add column if not exists sort_order integer not null default 0;

-- Khởi tạo sort_order theo đúng thứ tự đang hiển thị hiện tại (mới nhất trước)
-- để bật tính năng này không làm xáo trộn thứ tự đã có.
with ranked as (
  select id, row_number() over (order by created_at asc) as rn
  from public.partner_venues
)
update public.partner_venues p
set sort_order = ranked.rn
from ranked
where p.id = ranked.id;

-- Giai đoạn 7: vị trí tài xế theo thời gian thực.
-- Tài xế gửi toạ độ GPS định kỳ lên bảng drivers; khách đang có chuyến với tài
-- xế đó xem được xe di chuyển qua Supabase Realtime (WebSocket sẵn có, không
-- cần dựng server socket riêng). File idempotent.

-- ---------------------------------------------------------------------------
-- Cột vị trí trên bảng drivers
-- ---------------------------------------------------------------------------
alter table public.drivers add column if not exists current_lat double precision;
alter table public.drivers add column if not exists current_lng double precision;
alter table public.drivers add column if not exists location_updated_at timestamptz;

comment on column public.drivers.current_lat is 'Vĩ độ hiện tại của tài xế, cập nhật khi đang online/chạy chuyến.';
comment on column public.drivers.current_lng is 'Kinh độ hiện tại của tài xế.';
comment on column public.drivers.location_updated_at is 'Thời điểm cập nhật vị trí gần nhất — dùng để biết dữ liệu có còn mới không.';

-- ---------------------------------------------------------------------------
-- Hàm cập nhật vị trí: tài xế chỉ ghi được vị trí CỦA CHÍNH MÌNH.
-- Dùng hàm thay vì cho update thẳng để tránh tài xế sửa nhầm cột khác
-- (today_revenue, approved...) qua REST API.
-- ---------------------------------------------------------------------------
create or replace function public.update_driver_location(p_lat double precision, p_lng double precision)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_lat is null or p_lng is null then
    raise exception 'Toạ độ không hợp lệ';
  end if;
  if p_lat < -90 or p_lat > 90 or p_lng < -180 or p_lng > 180 then
    raise exception 'Toạ độ ngoài phạm vi hợp lệ';
  end if;

  update public.drivers
  set current_lat = p_lat,
      current_lng = p_lng,
      location_updated_at = now()
  where id = auth.uid();
end;
$$;

grant execute on function public.update_driver_location(double precision, double precision) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS: GIỮ NGUYÊN policy drivers_select_for_assigned_customer của Giai đoạn 4
-- (khách đọc được hàng drivers khi có chuyến chung, không giới hạn trạng thái).
--
-- Cân nhắc đã xét: ban đầu định siết "chỉ xem được khi chuyến đang diễn ra" cho
-- kín hơn, NHƯNG getAssignedDriverInfo() dùng `drivers!inner` nên siết như vậy
-- sẽ làm màn hình đánh giá sau chuyến mất thông tin tài xế (join hỏng khi chuyến
-- đã completed). Đổi lại, phía app chỉ theo dõi vị trí khi chuyến đang chạy nên
-- thực tế không lộ vị trí sau chuyến.
--
-- Bảng drivers đã nằm trong publication realtime từ Giai đoạn 4 nên khách nhận
-- được cập nhật vị trí ngay, không cần thêm cấu hình.
-- ---------------------------------------------------------------------------

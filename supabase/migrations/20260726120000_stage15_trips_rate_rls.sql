-- Bug: khách gửi đánh giá (rateTrip -> update trips.customer_rating/feedback)
-- luôn bị lỗi "Không gửi được đánh giá." vì policy trips_update_own_customer
-- (từ stage4_dispatch) chỉ cho phép customer update khi with check status =
-- 'cancelled' — không có nhánh nào cho phép đánh giá chuyến đã 'completed'.
-- Thêm 1 policy permissive riêng cho việc đánh giá (Postgres OR các policy
-- permissive cùng lệnh update lại với nhau). Idempotent.

drop policy if exists trips_rate_own_customer on public.trips;
create policy trips_rate_own_customer on public.trips
  for update
  using (customer_id = auth.uid() and status = 'completed')
  with check (customer_id = auth.uid() and status = 'completed');

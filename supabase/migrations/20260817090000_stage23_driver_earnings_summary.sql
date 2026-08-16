-- Giai đoạn 23: báo cáo thu nhập tài xế thật — trước đây driver.earnings.tsx
-- tính doanh thu tuần/tháng bằng công thức cộng vào số hardcode
-- (4230000 + (todayRevenue - 890000)...) và mảng lịch sử giao dịch TX cũng là
-- 5 dòng gõ tay. Hàm dưới đây tổng hợp THẬT từ bảng trips theo mốc giờ Việt
-- Nam (Asia/Ho_Chi_Minh), không phụ thuộc drivers.today_trips/today_revenue
-- (2 cột đó không có cơ chế reset về 0 mỗi ngày nên không đáng tin cho "hôm
-- nay"). File idempotent.

create or replace function public.get_driver_earnings_summary()
returns table (
  today_gross numeric,
  today_trips integer,
  week_gross numeric,
  month_gross numeric,
  month_trips integer,
  lifetime_trips integer,
  month_fee numeric,
  month_net numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with completed as (
    select price, (completed_at at time zone 'Asia/Ho_Chi_Minh') as completed_local
    from public.trips
    where driver_id = auth.uid() and status = 'completed'
  )
  select
    coalesce(sum(price) filter (
      where completed_local::date = (now() at time zone 'Asia/Ho_Chi_Minh')::date
    ), 0) as today_gross,
    count(*) filter (
      where completed_local::date = (now() at time zone 'Asia/Ho_Chi_Minh')::date
    )::int as today_trips,
    coalesce(sum(price) filter (
      where date_trunc('week', completed_local) = date_trunc('week', now() at time zone 'Asia/Ho_Chi_Minh')
    ), 0) as week_gross,
    coalesce(sum(price) filter (
      where date_trunc('month', completed_local) = date_trunc('month', now() at time zone 'Asia/Ho_Chi_Minh')
    ), 0) as month_gross,
    count(*) filter (
      where date_trunc('month', completed_local) = date_trunc('month', now() at time zone 'Asia/Ho_Chi_Minh')
    )::int as month_trips,
    count(*)::int as lifetime_trips,
    round(coalesce(sum(price) filter (
      where date_trunc('month', completed_local) = date_trunc('month', now() at time zone 'Asia/Ho_Chi_Minh')
    ), 0) * 0.15) as month_fee,
    coalesce(sum(price) filter (
      where date_trunc('month', completed_local) = date_trunc('month', now() at time zone 'Asia/Ho_Chi_Minh')
    ), 0) * 0.85 as month_net
  from completed;
$$;

grant execute on function public.get_driver_earnings_summary() to authenticated;

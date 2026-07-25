-- Đánh giá của khách (trips.customer_rating) trước đây chỉ lưu vào chính
-- chuyến đó, không có gì tính lại điểm trung bình cho tài xế — drivers.rating
-- đứng yên mãi ở giá trị mặc định 5.0. Thêm trigger: mỗi khi customer_rating
-- của 1 chuyến được set/đổi, tính lại avg(customer_rating) trên TẤT CẢ chuyến
-- đã có đánh giá của đúng tài xế đó rồi ghi vào drivers.rating. File idempotent.

create or replace function public.recalc_driver_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Chỉ tính lại khi có tài xế gắn với chuyến, có điểm đánh giá, và điểm đó
  -- vừa thay đổi (tránh tính lại vô ích mỗi lần trips được update vì lý do khác).
  if new.driver_id is not null
     and new.customer_rating is not null
     and new.customer_rating is distinct from old.customer_rating then
    update public.drivers
    set rating = coalesce(
      (
        select round(avg(customer_rating)::numeric, 2)
        from public.trips
        where driver_id = new.driver_id and customer_rating is not null
      ),
      5.0
    )
    where id = new.driver_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trips_recalc_driver_rating on public.trips;
create trigger trips_recalc_driver_rating
  after update of customer_rating on public.trips
  for each row
  execute function public.recalc_driver_rating();

-- Tài xế đánh giá khách (1-5 sao), chiều ngược lại của stage13 (khách đánh
-- giá tài xế). Thêm trips.driver_rating/driver_feedback + profiles.rating
-- (điểm trung bình khách nhận được, chỉ có ý nghĩa với role=customer) + trigger
-- tự tính lại mỗi khi driver_rating của 1 chuyến thay đổi. File idempotent.
--
-- Không cần thêm RLS: trips_update_own_driver (từ stage4_dispatch) đã cho
-- phép tài xế update mọi cột trên chuyến của mình (using driver_id=auth.uid()),
-- nên set driver_rating/driver_feedback đã đi qua được policy đó.

alter table public.trips
  add column if not exists driver_rating smallint check (driver_rating between 1 and 5);
alter table public.trips add column if not exists driver_feedback text;

alter table public.profiles add column if not exists rating numeric(3, 2) not null default 5.0;
comment on column public.profiles.rating is
  'Điểm trung bình do tài xế đánh giá (role=customer) -- tự tính qua trigger trips_recalc_customer_rating, không phải cột người dùng tự sửa trực tiếp.';

create or replace function public.recalc_customer_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.customer_id is not null
     and new.driver_rating is not null
     and new.driver_rating is distinct from old.driver_rating then
    update public.profiles
    set rating = coalesce(
      (
        select round(avg(driver_rating)::numeric, 2)
        from public.trips
        where customer_id = new.customer_id and driver_rating is not null
      ),
      5.0
    )
    where id = new.customer_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trips_recalc_customer_rating on public.trips;
create trigger trips_recalc_customer_rating
  after update of driver_rating on public.trips
  for each row
  execute function public.recalc_customer_rating();

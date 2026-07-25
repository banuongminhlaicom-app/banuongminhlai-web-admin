-- Cho phép mã khuyến mãi giảm theo % (thay vì chỉ số tiền cố định như trước).
-- discount_type = 'fixed'   -> cột discount là số tiền VNĐ trừ thẳng (hành vi cũ)
-- discount_type = 'percent' -> cột discount là % (1-100), trừ theo % tổng tiền
--                               trước khuyến mãi lúc tính giá chuyến.
-- Mặc định 'fixed' để các mã đã tạo trước đó không đổi hành vi. File idempotent.

alter table public.promotions add column if not exists discount_type text not null default 'fixed';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'promotions_discount_type_check'
  ) then
    alter table public.promotions
      add constraint promotions_discount_type_check
      check (discount_type in ('fixed', 'percent'));
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'promotions_percent_range_check'
  ) then
    alter table public.promotions
      add constraint promotions_percent_range_check
      check (discount_type <> 'percent' or (discount > 0 and discount <= 100));
  end if;
end $$;

comment on column public.promotions.discount_type is
  'fixed: discount là số tiền VNĐ trừ thẳng. percent: discount là % (1-100) trừ theo % tổng tiền trước khuyến mãi.';

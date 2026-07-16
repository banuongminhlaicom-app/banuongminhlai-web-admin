-- Seed tối thiểu cho môi trường dev/local.
-- Chỉ seed dữ liệu cấu hình (pricing, promotions) khớp với src/lib/pricing.ts và src/lib/mock.ts —
-- KHÔNG seed người dùng/tài xế giả vì tài khoản phải đi qua Supabase Auth thật ở Giai đoạn 1.

insert into public.pricing_rules (
  region, opening_fee, minimum_price, first_distance_limit, first_distance_price,
  price_per_extra_km, waiting_price_per_minute, night_surcharge_percent,
  night_start_hour, night_end_hour
) values (
  'Cao Lãnh, Đồng Tháp', 50000, 100000, 5, 100000, 15000, 2000, 20, 22, 5
)
on conflict (region) do nothing;

insert into public.promotions (code, title, description, discount, expires_at, active) values
  ('TAIXE30', 'Giảm 30.000đ chuyến đầu', 'Áp dụng cho khách hàng mới, tối thiểu 100.000đ', 30000, '2026-12-31', true),
  ('CUOITUAN', 'Giảm 20% cuối tuần', 'Áp dụng T7-CN, tối đa 50.000đ', 50000, '2026-09-30', true),
  ('DEMKHUYA', 'Miễn phụ phí đêm', 'Áp dụng chuyến sau 22:00', 25000, '2026-08-15', true)
on conflict (code) do nothing;

-- Giai đoạn 5: RLS cho pricing_rules — mọi user đã đăng nhập đọc được (khách
-- cần đọc để tính báo giá thật ở booking.tsx), chỉ admin được ghi. Idempotent.

drop policy if exists pricing_rules_select_authenticated on public.pricing_rules;
create policy pricing_rules_select_authenticated on public.pricing_rules
  for select using (auth.role() = 'authenticated');

drop policy if exists pricing_rules_write_admin on public.pricing_rules;
create policy pricing_rules_write_admin on public.pricing_rules
  for all using (public.is_admin()) with check (public.is_admin());

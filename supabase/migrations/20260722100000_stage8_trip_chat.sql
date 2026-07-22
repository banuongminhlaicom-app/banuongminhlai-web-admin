-- Giai đoạn 8: chat trong chuyến giữa khách và tài xế.
-- Dùng lại đúng hạ tầng sẵn có: bảng + RLS (chỉ 2 bên trong chuyến) + Realtime
-- (postgres_changes INSERT) giống cách notifications/trips đang chạy. Idempotent.

create table if not exists public.trip_messages (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

-- Lấy tin nhắn của 1 chuyến theo thứ tự thời gian là truy vấn nóng nhất.
create index if not exists trip_messages_trip_created_idx
  on public.trip_messages (trip_id, created_at);

alter table public.trip_messages enable row level security;

-- Đọc: chỉ khách hoặc tài xế CỦA CHÍNH chuyến đó mới thấy tin nhắn.
drop policy if exists trip_messages_select_participant on public.trip_messages;
create policy trip_messages_select_participant on public.trip_messages
  for select using (
    exists (
      select 1 from public.trips t
      where t.id = trip_messages.trip_id
        and (t.customer_id = auth.uid() or t.driver_id = auth.uid())
    )
  );

-- Gửi: người gửi phải là chính mình (sender_id = auth.uid()) VÀ là khách/tài xế
-- của chuyến — không thể mạo danh hay gửi vào chuyến của người khác.
drop policy if exists trip_messages_insert_participant on public.trip_messages;
create policy trip_messages_insert_participant on public.trip_messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.trips t
      where t.id = trip_messages.trip_id
        and (t.customer_id = auth.uid() or t.driver_id = auth.uid())
    )
  );

-- Realtime để 2 bên nhận tin nhắn mới tức thì.
do $$ begin
  alter publication supabase_realtime add table public.trip_messages;
exception when duplicate_object then null;
end $$;

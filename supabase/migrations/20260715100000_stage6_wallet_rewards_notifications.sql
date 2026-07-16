-- Giai đoạn 6: ví, điểm thưởng, thông báo — bảng mới + RLS + hàm bảo vệ số dư.
-- Ví/điểm chỉ ghi được qua hàm SECURITY DEFINER (wallet_topup, redeem_reward) để
-- khách không thể tự chèn/sửa số dư qua API (vd. gọi thẳng REST insert từ devtools).
-- "Nạp tiền" hiện là MÔ PHỎNG (demo) — chưa nối cổng thanh toán thật, việc đó nằm
-- ngoài phạm vi Supabase thuần. File idempotent.

-- ---------------------------------------------------------------------------
-- wallets + wallet_transactions
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.wallet_tx_type as enum ('topup', 'trip_payment', 'refund', 'adjustment');
exception when duplicate_object then null;
end $$;

create table if not exists public.wallets (
  owner_id uuid primary key references public.profiles (id) on delete cascade,
  balance numeric(12, 0) not null default 0,
  updated_at timestamptz not null default now()
);

comment on table public.wallets is 'Số dư ví của khách hàng. Chỉ ghi qua hàm wallet_topup().';

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  type public.wallet_tx_type not null,
  amount numeric(12, 0) not null,
  description text,
  created_at timestamptz not null default now()
);

comment on table public.wallet_transactions is 'Lịch sử giao dịch ví. amount dương = cộng, âm = trừ.';

create index if not exists wallet_transactions_owner_idx on public.wallet_transactions (owner_id, created_at desc);

-- ---------------------------------------------------------------------------
-- loyalty_points + points_transactions
-- ---------------------------------------------------------------------------
create table if not exists public.loyalty_points (
  owner_id uuid primary key references public.profiles (id) on delete cascade,
  balance integer not null default 0,
  updated_at timestamptz not null default now()
);

comment on table public.loyalty_points is 'Điểm thưởng của khách hàng. Chỉ ghi qua hàm redeem_reward() (và sau này earn khi hoàn thành chuyến).';

create table if not exists public.points_transactions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  delta integer not null,
  reason text not null,
  created_at timestamptz not null default now()
);

comment on table public.points_transactions is 'Lịch sử tích/đổi điểm. delta dương = cộng, âm = trừ.';

create index if not exists points_transactions_owner_idx on public.points_transactions (owner_id, created_at desc);

-- Backfill cho khách hàng đã tồn tại trước migration này (ensureProfile chỉ tạo
-- hàng cho khách hàng MỚI đăng ký sau khi có migration này).
insert into public.wallets (owner_id, balance)
  select id, 0 from public.profiles where role = 'customer'
  on conflict (owner_id) do nothing;

insert into public.loyalty_points (owner_id, balance)
  select id, 0 from public.profiles where role = 'customer'
  on conflict (owner_id) do nothing;

-- ---------------------------------------------------------------------------
-- Hàm ghi có kiểm soát — SECURITY DEFINER nên vượt qua RLS, nhưng validate
-- chặt (số dương, có trần) để tránh giá trị bất thường dù đây là ví/điểm demo.
-- ---------------------------------------------------------------------------
create or replace function public.wallet_topup(p_amount numeric, p_description text default 'Nạp tiền (mô phỏng)')
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_amount is null or p_amount <= 0 or p_amount > 5000000 then
    raise exception 'Số tiền nạp không hợp lệ';
  end if;

  update public.wallets set balance = balance + p_amount, updated_at = now() where owner_id = auth.uid();
  if not found then
    insert into public.wallets (owner_id, balance) values (auth.uid(), p_amount);
  end if;

  insert into public.wallet_transactions (owner_id, type, amount, description)
    values (auth.uid(), 'topup', p_amount, p_description);
end;
$$;

grant execute on function public.wallet_topup(numeric, text) to authenticated;

create or replace function public.redeem_reward(p_cost integer, p_title text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
begin
  if p_cost is null or p_cost <= 0 then
    raise exception 'Số điểm đổi không hợp lệ';
  end if;

  select balance into v_balance from public.loyalty_points where owner_id = auth.uid() for update;
  if v_balance is null then v_balance := 0; end if;
  if v_balance < p_cost then
    raise exception 'Không đủ điểm để đổi ưu đãi này';
  end if;

  update public.loyalty_points set balance = balance - p_cost, updated_at = now() where owner_id = auth.uid();
  insert into public.points_transactions (owner_id, delta, reason) values (auth.uid(), -p_cost, 'Đổi: ' || p_title);
end;
$$;

grant execute on function public.redeem_reward(integer, text) to authenticated;

alter table public.wallets enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.loyalty_points enable row level security;
alter table public.points_transactions enable row level security;

drop policy if exists wallets_select_own on public.wallets;
create policy wallets_select_own on public.wallets for select using (owner_id = auth.uid());

-- Lưới an toàn dự phòng: ensureProfile (client) tự tạo hàng ví/điểm balance=0
-- cho khách hàng mới đăng ký, cần quyền insert hàng của chính mình.
drop policy if exists wallets_insert_own on public.wallets;
create policy wallets_insert_own on public.wallets for insert with check (owner_id = auth.uid());

drop policy if exists wallet_tx_select_own on public.wallet_transactions;
create policy wallet_tx_select_own on public.wallet_transactions for select using (owner_id = auth.uid());

drop policy if exists points_select_own on public.loyalty_points;
create policy points_select_own on public.loyalty_points for select using (owner_id = auth.uid());

drop policy if exists points_insert_own on public.loyalty_points;
create policy points_insert_own on public.loyalty_points for insert with check (owner_id = auth.uid());

drop policy if exists points_tx_select_own on public.points_transactions;
create policy points_tx_select_own on public.points_transactions for select using (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- notifications: RLS còn thiếu từ Giai đoạn 0 (bảng đã tạo nhưng RLS bật mà
-- chưa có policy nào => khoá hoàn toàn, API không đọc/ghi được).
-- ---------------------------------------------------------------------------
drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications for select using (owner_id = auth.uid());

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications for update
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Tự động tạo thông báo cho khách hàng khi trạng thái chuyến đổi thật sự
-- (không fire khi dispatch chỉ gán driver_id, vì lúc đó status vẫn là 'searching').
create or replace function public.trips_notify_customer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title text;
  v_content text;
begin
  if new.status = old.status then return new; end if;

  case new.status
    when 'accepted' then
      v_title := 'Tài xế đã nhận chuyến';
      v_content := 'Tài xế sẽ đến đón bạn tại ' || new.pickup_address || '.';
    when 'arrived' then
      v_title := 'Tài xế đã đến điểm đón';
      v_content := 'Tài xế đang chờ bạn tại điểm đón.';
    when 'in_progress' then
      v_title := 'Chuyến đi bắt đầu';
      v_content := 'Chúc bạn có chuyến đi an toàn.';
    when 'completed' then
      v_title := 'Chuyến đi hoàn thành';
      v_content := 'Cảm ơn bạn đã sử dụng dịch vụ. Đừng quên đánh giá tài xế!';
    when 'cancelled' then
      v_title := 'Chuyến đi đã huỷ';
      v_content := 'Chuyến ' || new.code || ' đã được huỷ.';
    else
      return new;
  end case;

  insert into public.notifications (owner_id, title, content) values (new.customer_id, v_title, v_content);
  return new;
end;
$$;

drop trigger if exists trips_notify_customer_trigger on public.trips;
create trigger trips_notify_customer_trigger
  after update on public.trips
  for each row execute function public.trips_notify_customer();

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------
do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.wallets;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.loyalty_points;
exception when duplicate_object then null;
end $$;

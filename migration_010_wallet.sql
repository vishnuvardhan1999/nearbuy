-- ShopNip · Migration 010: ShopNip Wallet (store credit) and refunds-to-wallet.
-- Run once in the Supabase SQL editor AFTER all earlier migrations. Safe to re-run.
--
-- What it adds
--   * wallets               one row per customer, balance can never go below 0
--   * wallet_transactions   append-only ledger (every credit/debit, with balance_after)
--   * orders.wallet_applied / refunded_to_wallet / wallet_reversed
--   * refund_order_to_wallet()  shop owner or admin refunds an order as wallet credit
--   * place_order_wallet()      wraps the existing place_order() and, in the SAME transaction,
--                               spends wallet balance on the order (full or partial)
--   * trigger: if an order that used wallet money is cancelled/rejected, that wallet money
--     is returned automatically (once).
-- All writes happen inside SECURITY DEFINER functions; customers can only read their own rows.

-- 1. Tables --------------------------------------------------------------------
create table if not exists wallets (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  balance    numeric(10,2) not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists wallet_transactions (
  id            bigserial primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  amount        numeric(10,2) not null check (amount <> 0),       -- + credit, - debit
  balance_after numeric(10,2) not null check (balance_after >= 0),
  kind          text not null check (kind in ('refund','order_payment','order_reversal','adjustment')),
  order_id      uuid references orders(id) on delete set null,
  note          text,
  created_by    uuid,
  created_at    timestamptz not null default now()
);
create index if not exists wallet_tx_user_idx  on wallet_transactions(user_id, created_at desc);
create index if not exists wallet_tx_order_idx on wallet_transactions(order_id);

alter table orders add column if not exists wallet_applied     numeric(10,2) not null default 0 check (wallet_applied >= 0);
alter table orders add column if not exists refunded_to_wallet numeric(10,2) not null default 0 check (refunded_to_wallet >= 0);
alter table orders add column if not exists wallet_reversed    boolean not null default false;

-- 2. RLS: read-only for clients ----------------------------------------------------
alter table wallets enable row level security;
alter table wallet_transactions enable row level security;
drop policy if exists "wallets read own" on wallets;
create policy "wallets read own" on wallets for select using (user_id = auth.uid() or is_admin());
drop policy if exists "wallet_tx read own" on wallet_transactions;
create policy "wallet_tx read own" on wallet_transactions for select using (user_id = auth.uid() or is_admin());
-- shop owners may see refund rows for orders at their own shop (so the inbox can show them)
drop policy if exists "wallet_tx read shop refunds" on wallet_transactions;
create policy "wallet_tx read shop refunds" on wallet_transactions for select using (
  order_id is not null and exists (select 1 from orders o join shops s on s.id = o.shop_id
                                   where o.id = order_id and s.owner_id = auth.uid()));
-- no insert/update/delete policies: only the functions below can write.
revoke insert, update, delete on wallets, wallet_transactions from anon, authenticated;

-- 3. Internal ledger helper (not callable by clients) --------------------------------
create or replace function wallet_post(p_user uuid, p_amount numeric, p_kind text, p_order uuid, p_note text, p_by uuid)
returns numeric language plpgsql security definer set search_path = public as $$
declare v_bal numeric(10,2);
begin
  if p_user is null then raise exception 'Wallet owner missing'; end if;
  if p_amount is null or p_amount = 0 then raise exception 'Wallet amount must not be zero'; end if;
  insert into wallets(user_id) values (p_user) on conflict (user_id) do nothing;
  select balance into v_bal from wallets where user_id = p_user for update;   -- row lock = no double spend
  if v_bal + p_amount < 0 then raise exception 'Not enough wallet balance'; end if;
  update wallets set balance = v_bal + p_amount, updated_at = now() where user_id = p_user;
  insert into wallet_transactions(user_id, amount, balance_after, kind, order_id, note, created_by)
  values (p_user, round(p_amount,2), v_bal + p_amount, p_kind, p_order, nullif(left(coalesce(p_note,''),300),''), p_by);
  return v_bal + p_amount;
end $$;
revoke all on function wallet_post(uuid,numeric,text,uuid,text,uuid) from public, anon, authenticated;

-- 4. Refund an order to the customer's wallet (shop owner or admin) ---------------------
create or replace function refund_order_to_wallet(p_order uuid, p_amount numeric, p_reason text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_o orders%rowtype; v_max numeric(10,2); v_bal numeric(10,2); v_amt numeric(10,2);
begin
  if v_uid is null then raise exception 'Please log in'; end if;
  select * into v_o from orders where id = p_order for update;
  if not found then raise exception 'Order not found'; end if;
  if not (is_admin() or exists (select 1 from shops where id = v_o.shop_id and owner_id = v_uid)) then
    raise exception 'Only the shop or ShopNip admin can refund this order'; end if;
  if v_o.customer_id is null then raise exception 'This order has no customer account to refund to'; end if;
  v_amt := round(coalesce(p_amount,0), 2);
  if v_amt <= 0 then raise exception 'Refund amount must be more than £0'; end if;
  -- what is still refundable: order total, less earlier wallet refunds, less wallet money already auto-returned on cancel
  v_max := v_o.total - v_o.refunded_to_wallet - case when v_o.wallet_reversed then v_o.wallet_applied else 0 end;
  if v_amt > v_max then raise exception 'You can refund at most £% on this order', greatest(v_max,0); end if;

  v_bal := wallet_post(v_o.customer_id, v_amt, 'refund', v_o.id,
                       coalesce(nullif(trim(p_reason),''), 'Refund for order ' || coalesce(v_o.order_number, v_o.id::text)), v_uid);
  update orders set refunded_to_wallet = refunded_to_wallet + v_amt, updated_at = now() where id = v_o.id;
  insert into order_events(order_id, status, note, by_user)
  values (v_o.id, 'refunded_to_wallet', '£' || v_amt::text || ' refunded to ShopNip wallet' || coalesce(' · ' || nullif(left(trim(p_reason),200),''), ''), v_uid);
  return jsonb_build_object('order_id', v_o.id, 'refunded', v_amt, 'refunded_total', v_o.refunded_to_wallet + v_amt,
                            'refundable_left', v_max - v_amt, 'customer_balance', v_bal);
end $$;
revoke all on function refund_order_to_wallet(uuid,numeric,text) from public, anon;
grant execute on function refund_order_to_wallet(uuid,numeric,text) to authenticated;

-- 5. Place an order and (optionally) pay with wallet, atomically ------------------------
-- Calls the existing place_order() unchanged, then debits the wallet inside the same
-- transaction. If anything fails, the whole order (and stock change) is rolled back.
create or replace function place_order_wallet(
  p_shop uuid, p_items jsonb, p_fulfilment text,
  p_name text, p_phone text, p_address text default null, p_postcode text default null,
  p_note text default null, p_lat double precision default null, p_lng double precision default null,
  p_use_wallet boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_r jsonb; v_id uuid; v_total numeric(10,2); v_bal numeric(10,2) := 0; v_use numeric(10,2) := 0;
begin
  if v_uid is null then raise exception 'Please log in to place an order'; end if;
  v_r := place_order(p_shop, p_items, p_fulfilment, p_name, p_phone, p_address, p_postcode, p_note, p_lat, p_lng);
  v_id := (v_r->>'id')::uuid;
  select total into v_total from orders where id = v_id for update;
  if coalesce(p_use_wallet,false) then
    select balance into v_bal from wallets where user_id = v_uid for update;
    v_use := least(coalesce(v_bal,0), v_total);
    if v_use > 0 then
      perform wallet_post(v_uid, -v_use, 'order_payment', v_id, 'Paid towards order ' || coalesce(v_r->>'order_number',''), v_uid);
      update orders set wallet_applied = v_use, updated_at = now() where id = v_id;
    end if;
  end if;
  return v_r || jsonb_build_object('wallet_applied', v_use, 'amount_due', v_total - v_use);
end $$;
revoke all on function place_order_wallet(uuid,jsonb,text,text,text,text,text,text,double precision,double precision,boolean) from public, anon;
grant execute on function place_order_wallet(uuid,jsonb,text,text,text,text,text,text,double precision,double precision,boolean) to authenticated;

-- 6. Return wallet money automatically when a wallet-paid order is cancelled/rejected ------
create or replace function orders_wallet_reverse() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status in ('cancelled','rejected') and old.status not in ('cancelled','rejected')
     and new.wallet_applied > 0 and not new.wallet_reversed and new.customer_id is not null then
    perform wallet_post(new.customer_id, new.wallet_applied, 'order_reversal', new.id,
                        'Wallet money returned: order ' || coalesce(new.order_number, new.id::text) || ' ' || new.status, auth.uid());
    new.wallet_reversed := true;
  end if;
  return new;
end $$;
drop trigger if exists orders_wallet_reverse_trg on orders;
create trigger orders_wallet_reverse_trg before update of status on orders
  for each row execute function orders_wallet_reverse();

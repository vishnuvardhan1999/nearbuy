-- ShopNip: reviews, follows, end-of-day offers, and required cancellation reasons.
-- Run once in the Supabase SQL editor after migration_003_orders.sql. Safe to re-run.

-- 1. Reviews ----------------------------------------------------------------
create table if not exists shop_reviews (
  shop_id uuid not null references shops(id) on delete cascade,
  customer_id uuid not null references auth.users(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  body text not null default '' check (char_length(body) <= 400),
  hidden boolean not null default false,
  reports int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (shop_id, customer_id)
);
alter table shop_reviews enable row level security;
drop policy if exists "reviews public read" on shop_reviews;
create policy "reviews public read" on shop_reviews for select using (
  (not hidden and exists (select 1 from shops s where s.id = shop_id and s.active and s.status = 'approved'))
  or customer_id = auth.uid()
  or exists (select 1 from shops s where s.id = shop_id and s.owner_id = auth.uid())
  or is_admin());

create table if not exists shop_review_reports (
  shop_id uuid not null,
  customer_id uuid not null,
  reporter uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (shop_id, customer_id, reporter),
  foreign key (shop_id, customer_id) references shop_reviews(shop_id, customer_id) on delete cascade
);
alter table shop_review_reports enable row level security;
drop policy if exists "review reports own read" on shop_review_reports;
create policy "review reports own read" on shop_review_reports for select using (reporter = auth.uid() or is_admin());

create or replace function save_shop_review(p_shop uuid, p_rating int, p_body text)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Please log in to leave a review'; end if;
  if p_rating < 1 or p_rating > 5 then raise exception 'Choose a rating from 1 to 5'; end if;
  if char_length(coalesce(p_body,'')) > 400 then raise exception 'Keep the review under 400 characters'; end if;
  if exists (select 1 from shops where id = p_shop and owner_id = v_uid) then
    raise exception 'You can’t review your own shop';
  end if;
  if not exists (select 1 from shops where id = p_shop and active and status = 'approved') then
    raise exception 'This shop is not open for reviews';
  end if;
  insert into shop_reviews(shop_id, customer_id, rating, body)
  values (p_shop, v_uid, p_rating, left(btrim(p_body), 400))
  on conflict (shop_id, customer_id) do update
    set rating = excluded.rating, body = excluded.body, hidden = false, updated_at = now();
end $$;
revoke all on function save_shop_review(uuid, int, text) from public, anon;
grant execute on function save_shop_review(uuid, int, text) to authenticated;

create or replace function report_shop_review(p_shop uuid, p_customer uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_n int;
begin
  if v_uid is null then raise exception 'Please log in'; end if;
  if v_uid = p_customer then raise exception 'You can’t report your own review'; end if;
  insert into shop_review_reports(shop_id, customer_id, reporter)
  values (p_shop, p_customer, v_uid)
  on conflict do nothing;
  select count(*) into v_n from shop_review_reports where shop_id = p_shop and customer_id = p_customer;
  update shop_reviews set reports = v_n, hidden = (v_n >= 3) where shop_id = p_shop and customer_id = p_customer;
end $$;
revoke all on function report_shop_review(uuid, uuid) from public, anon;
grant execute on function report_shop_review(uuid, uuid) to authenticated;

-- 2. Follows ----------------------------------------------------------------
create table if not exists shop_follows (
  shop_id uuid not null references shops(id) on delete cascade,
  customer_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (shop_id, customer_id)
);
alter table shop_follows enable row level security;
drop policy if exists "follows own read" on shop_follows;
create policy "follows own read" on shop_follows for select using (
  customer_id = auth.uid()
  or exists (select 1 from shops s where s.id = shop_id and s.owner_id = auth.uid())
  or is_admin());
drop policy if exists "follows own write" on shop_follows;
create policy "follows own write" on shop_follows for insert with check (
  customer_id = auth.uid()
  and not exists (select 1 from shops s where s.id = shop_id and s.owner_id = auth.uid()));
drop policy if exists "follows own delete" on shop_follows;
create policy "follows own delete" on shop_follows for delete using (customer_id = auth.uid());

-- 3. End-of-day offers + in-app notices ------------------------------------
create table if not exists shop_offers (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 2 and 80),
  detail text,
  price numeric(10,2) check (price is null or price >= 0),
  discount_pct smallint check (discount_pct is null or discount_pct between 1 and 90),
  valid_until timestamptz not null,
  created_at timestamptz not null default now(),
  active boolean not null default true,
  check (price is not null or discount_pct is not null)
);
alter table shop_offers enable row level security;
drop policy if exists "offers public read" on shop_offers;
create policy "offers public read" on shop_offers for select using (
  (active and valid_until > now() and exists (select 1 from shops s where s.id = shop_id and s.active and s.status = 'approved'))
  or exists (select 1 from shops s where s.id = shop_id and s.owner_id = auth.uid())
  or is_admin());

create table if not exists offer_notices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  offer_id uuid not null references shop_offers(id) on delete cascade,
  shop_id uuid not null,
  shop_name text,
  title text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
alter table offer_notices enable row level security;
drop policy if exists "notices own read" on offer_notices;
create policy "notices own read" on offer_notices for select using (user_id = auth.uid());
drop policy if exists "notices own update" on offer_notices;
create policy "notices own update" on offer_notices for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function post_shop_offer(
  p_title text, p_detail text, p_price numeric, p_discount int, p_until timestamptz)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_shop shops%rowtype; v_id uuid; v_f record;
begin
  if v_uid is null then raise exception 'Please log in'; end if;
  select * into v_shop from shops where owner_id = v_uid;
  if not found then raise exception 'No shop on this account'; end if;
  if coalesce(btrim(p_title),'') = '' then raise exception 'Give the offer a name'; end if;
  if p_price is null and (p_discount is null or p_discount < 1) then raise exception 'Add a price or a discount'; end if;
  if p_until is null or p_until <= now() then raise exception 'Pick a time later today, in UK time'; end if;
  insert into shop_offers(shop_id, title, detail, price, discount_pct, valid_until)
  values (v_shop.id, left(btrim(p_title),80), nullif(left(btrim(coalesce(p_detail,'')),240),''), p_price, p_discount, p_until)
  returning id into v_id;
  for v_f in select customer_id from shop_follows where shop_id = v_shop.id loop
    insert into offer_notices(user_id, offer_id, shop_id, shop_name, title)
    values (v_f.customer_id, v_id, v_shop.id, v_shop.name, left(btrim(p_title),80));
  end loop;
  return v_id;
end $$;
revoke all on function post_shop_offer(text, text, numeric, int, timestamptz) from public, anon;
grant execute on function post_shop_offer(text, text, numeric, int, timestamptz) to authenticated;

-- 4. Cancellation reason (required) -----------------------------------------
alter table orders add column if not exists cancel_reason text;
alter table orders add column if not exists cancel_note text;
alter table orders add column if not exists cancelled_by uuid;
alter table orders add column if not exists cancelled_role text;
alter table orders add column if not exists cancelled_at timestamptz;
alter table orders drop constraint if exists orders_cancelled_role_check;
alter table orders add constraint orders_cancelled_role_check
  check (cancelled_role is null or cancelled_role in ('customer','seller'));

drop function if exists update_order_status(uuid, text, text);
create or replace function update_order_status(
  p_order uuid, p_status text, p_note text default null, p_cancel_reason text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_o orders%rowtype; v_owner boolean; v_ok boolean := false;
  v_role text; v_reason text;
begin
  if v_uid is null then raise exception 'Please log in'; end if;
  select * into v_o from orders where id = p_order for update;
  if not found then raise exception 'Order not found'; end if;
  v_owner := exists (select 1 from shops where id = v_o.shop_id and owner_id = v_uid) or is_admin();

  if v_owner then
    v_ok := (v_o.status = 'placed' and p_status in ('accepted','rejected'))
         or (v_o.status = 'accepted' and p_status = 'cancelled')
         or (v_o.status = 'accepted' and v_o.fulfilment = 'collect' and p_status = 'ready')
         or (v_o.status = 'accepted' and v_o.fulfilment = 'delivery' and p_status = 'out_for_delivery')
         or (v_o.status in ('ready','out_for_delivery') and p_status in ('completed','cancelled'));
  end if;
  if not v_ok and v_o.customer_id = v_uid then
    v_ok := v_o.status = 'placed' and p_status = 'cancelled';
  end if;
  if not v_ok then raise exception 'Cannot change this order from % to %', v_o.status, p_status; end if;

  if p_status = 'cancelled' then
    v_reason := lower(btrim(coalesce(p_cancel_reason,'')));
    if v_reason not in ('changed','mistake','elsewhere','slow','cant','stock','closing','other') then
      raise exception 'Choose a cancellation reason';
    end if;
    if v_reason = 'other' and char_length(btrim(coalesce(p_note,''))) < 2 then
      raise exception 'Tell us a bit more when you choose Other';
    end if;
    v_role := case when v_o.customer_id = v_uid and not v_owner then 'customer' else 'seller' end;
  end if;

  if p_status in ('rejected','cancelled') then
    update shop_listings l set stock = l.stock + i.qty, updated_at = now()
      from order_items i where i.order_id = p_order and i.listing_id = l.id;
  end if;
  update orders set status = p_status, updated_at = now(),
         reject_reason = case when p_status = 'rejected' then nullif(left(coalesce(p_note,''),300),'') else reject_reason end,
         cancel_reason = case when p_status = 'cancelled' then v_reason else cancel_reason end,
         cancel_note = case when p_status = 'cancelled' then nullif(left(btrim(coalesce(p_note,'')),300),'') else cancel_note end,
         cancelled_by = case when p_status = 'cancelled' then v_uid else cancelled_by end,
         cancelled_role = case when p_status = 'cancelled' then v_role else cancelled_role end,
         cancelled_at = case when p_status = 'cancelled' then now() else cancelled_at end
   where id = p_order;
  insert into order_events(order_id, status, note, by_user)
  values (p_order, p_status, nullif(left(coalesce(p_note,''),300),''), v_uid);
  return jsonb_build_object('id', p_order, 'status', p_status);
end $$;
revoke all on function update_order_status(uuid, text, text, text) from public, anon;
grant execute on function update_order_status(uuid, text, text, text) to authenticated;

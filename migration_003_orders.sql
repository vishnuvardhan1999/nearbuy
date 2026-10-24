-- Nearbuy (a NuvonHub product) · Migration 003: ordering (no online payment yet).
-- Run once in the Supabase SQL editor after migration_002_phase2.sql.

-- 1. Orders: new columns, statuses, order numbers ---------------------------
create sequence if not exists order_no_seq start 1001;
alter table orders add column if not exists order_no bigint;
alter table orders alter column order_no set default nextval('order_no_seq');
update orders set order_no = nextval('order_no_seq') where order_no is null;
alter table orders alter column order_no set not null;
create unique index if not exists orders_order_no_idx on orders(order_no);
alter table orders add column if not exists order_number text generated always as ('NB-' || order_no::text) stored;
alter table orders add column if not exists subtotal numeric(10,2) not null default 0;
alter table orders add column if not exists delivery_fee numeric(10,2) not null default 0;
alter table orders add column if not exists delivery_postcode text;
alter table orders add column if not exists note text;
alter table orders add column if not exists payment_method text not null default 'pay_on_collection';
alter table orders add column if not exists reject_reason text;
alter table orders add column if not exists updated_at timestamptz default now();

alter table orders drop constraint if exists orders_status_check;
update orders set status = 'placed' where status = 'new';
alter table orders alter column status set default 'placed';
alter table orders add constraint orders_status_check
  check (status in ('placed','accepted','ready','out_for_delivery','completed','cancelled','rejected'));
alter table orders drop constraint if exists orders_payment_method_check;
alter table orders add constraint orders_payment_method_check check (payment_method in ('pay_on_collection','pay_on_delivery'));
create index if not exists orders_shop_idx on orders(shop_id, created_at desc);
create index if not exists orders_customer_idx on orders(customer_id, created_at desc);
create index if not exists order_items_order_idx on order_items(order_id);
alter table order_items add column if not exists image text;

-- Status timeline
create table if not exists order_events (
  id bigserial primary key,
  order_id uuid not null references orders(id) on delete cascade,
  status text not null,
  note text,
  by_user uuid,
  at timestamptz not null default now()
);
create index if not exists order_events_order_idx on order_events(order_id, at);

-- 2. RLS: reads only; all writes go through the RPCs below --------------------
drop policy if exists "orders customer insert" on orders;
drop policy if exists "orders shop update" on orders;
drop policy if exists "order_items customer insert" on order_items;
drop policy if exists "orders read" on orders;
create policy "orders read" on orders for select using (
  customer_id = auth.uid() or is_admin()
  or exists (select 1 from shops s where s.id = shop_id and s.owner_id = auth.uid()));
drop policy if exists "order_items read" on order_items;
create policy "order_items read" on order_items for select using (
  exists (select 1 from orders o where o.id = order_id and (o.customer_id = auth.uid() or is_admin()
    or exists (select 1 from shops s where s.id = o.shop_id and s.owner_id = auth.uid()))));
alter table order_events enable row level security;
drop policy if exists "order_events read" on order_events;
create policy "order_events read" on order_events for select using (
  exists (select 1 from orders o where o.id = order_id and (o.customer_id = auth.uid() or is_admin()
    or exists (select 1 from shops s where s.id = o.shop_id and s.owner_id = auth.uid()))));

-- 3. place_order -------------------------------------------------------------
-- p_items: [{"listing_id":"<uuid>","qty":2}, ...]. Prices are taken from shop_listings, never from the client.
create or replace function place_order(
  p_shop uuid, p_items jsonb, p_fulfilment text,
  p_name text, p_phone text, p_address text default null, p_postcode text default null,
  p_note text default null, p_lat double precision default null, p_lng double precision default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_shop shops%rowtype; v_order orders%rowtype;
  v_item jsonb; v_l shop_listings%rowtype; v_qty int; v_sub numeric(10,2) := 0; v_fee numeric(10,2) := 0;
  v_dist double precision; v_seen uuid[] := '{}';
begin
  if v_uid is null then raise exception 'Please log in to place an order'; end if;
  if p_fulfilment not in ('collect','delivery') then raise exception 'Choose collection or delivery'; end if;
  if coalesce(trim(p_name),'') = '' or coalesce(trim(p_phone),'') = '' then raise exception 'Name and phone are required'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'Your basket is empty'; end if;
  if jsonb_array_length(p_items) > 50 then raise exception 'Too many items in one order'; end if;

  select * into v_shop from shops where id = p_shop;
  if not found or not v_shop.active or v_shop.status <> 'approved' then raise exception 'This shop is not taking orders right now'; end if;

  if p_fulfilment = 'collect' and coalesce((v_shop.delivery_options->>'collect')::boolean, true) = false then
    raise exception 'This shop does not offer click & collect'; end if;
  if p_fulfilment = 'delivery' then
    if coalesce((v_shop.delivery_options->>'delivery')::boolean, false) = false then raise exception 'This shop does not deliver'; end if;
    if coalesce(trim(p_address),'') = '' then raise exception 'Delivery address is required'; end if;
    if p_lat is null or p_lng is null then raise exception 'Delivery postcode could not be located'; end if;
    if v_shop.lat is not null and v_shop.lng is not null then
      v_dist := 3958.8 * 2 * asin(sqrt(power(sin(radians(p_lat - v_shop.lat)/2),2)
                + cos(radians(v_shop.lat)) * cos(radians(p_lat)) * power(sin(radians(p_lng - v_shop.lng)/2),2)));
      if v_dist > coalesce((v_shop.delivery_options->>'delivery_radius_miles')::numeric, 0) then
        raise exception 'Sorry, % is outside this shop''s delivery area', coalesce(p_postcode,'that address'); end if;
    end if;
    v_fee := coalesce((v_shop.delivery_options->>'delivery_fee')::numeric, 0);
  end if;

  insert into orders(shop_id, customer_id, customer_name, customer_phone, customer_email, fulfilment, delivery_address, delivery_postcode,
                     note, payment_method, status, delivery_fee)
  values (p_shop, v_uid, trim(p_name), trim(p_phone), (select email from auth.users where id = v_uid), p_fulfilment,
          case when p_fulfilment = 'delivery' then trim(p_address) end, case when p_fulfilment = 'delivery' then upper(trim(p_postcode)) end,
          nullif(left(trim(coalesce(p_note,'')), 500), ''),
          case when p_fulfilment = 'delivery' then 'pay_on_delivery' else 'pay_on_collection' end, 'placed', v_fee)
  returning * into v_order;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'qty')::int;
    if v_qty is null or v_qty < 1 or v_qty > 99 then raise exception 'Invalid quantity'; end if;
    select * into v_l from shop_listings where id = (v_item->>'listing_id')::uuid for update;
    if not found or v_l.shop_id <> p_shop then raise exception 'An item in your basket is no longer available'; end if;
    if (v_l.id = any(v_seen)) then raise exception 'Duplicate item in basket'; end if;
    v_seen := v_seen || v_l.id;
    if not v_l.active or v_l.retail_price is null or v_l.retail_price <= 0 then raise exception '% is no longer available', v_l.name; end if;
    if v_l.stock < v_qty then raise exception 'Only % left of %', v_l.stock, v_l.name; end if;
    update shop_listings set stock = stock - v_qty, updated_at = now() where id = v_l.id;
    insert into order_items(order_id, listing_id, sku, name, image, unit_price, qty)
    values (v_order.id, v_l.id, v_l.sku, coalesce(v_l.name, v_l.sku), v_l.image, v_l.retail_price, v_qty);
    v_sub := v_sub + v_l.retail_price * v_qty;
  end loop;

  update orders set subtotal = v_sub, total = v_sub + v_fee where id = v_order.id;
  insert into order_events(order_id, status, by_user) values (v_order.id, 'placed', v_uid);
  return jsonb_build_object('id', v_order.id, 'order_number', 'NB-' || v_order.order_no, 'total', v_sub + v_fee);
end $$;

-- 4. update_order_status -------------------------------------------------------
-- Owner:    placed→accepted|rejected; accepted→ready (collect)|out_for_delivery (delivery)|cancelled; ready|out_for_delivery→completed|cancelled
-- Customer: placed→cancelled
-- Stock is restored on rejected / cancelled.
create or replace function update_order_status(p_order uuid, p_status text, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_o orders%rowtype; v_owner boolean; v_ok boolean := false;
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

  if p_status in ('rejected','cancelled') then
    update shop_listings l set stock = l.stock + i.qty, updated_at = now()
      from order_items i where i.order_id = p_order and i.listing_id = l.id;
  end if;
  update orders set status = p_status, updated_at = now(),
         reject_reason = case when p_status in ('rejected','cancelled') then nullif(left(coalesce(p_note,''),300),'') else reject_reason end
   where id = p_order;
  insert into order_events(order_id, status, note, by_user) values (p_order, p_status, nullif(left(coalesce(p_note,''),300),''), v_uid);
  return jsonb_build_object('id', p_order, 'status', p_status);
end $$;

revoke all on function place_order(uuid,jsonb,text,text,text,text,text,text,double precision,double precision) from public, anon;
grant execute on function place_order(uuid,jsonb,text,text,text,text,text,text,double precision,double precision) to authenticated;
revoke all on function update_order_status(uuid,text,text) from public, anon;
grant execute on function update_order_status(uuid,text,text) to authenticated;

-- 5. Realtime --------------------------------------------------------------------
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders') then
    alter publication supabase_realtime add table orders;
  end if;
end $$;

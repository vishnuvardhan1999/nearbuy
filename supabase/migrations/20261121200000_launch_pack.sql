-- ShopNip · Launch pack (items 2, 3, 4, 6, 10, 11, 12, 13).
-- Run once in the Supabase SQL editor.
-- Safe to re-run: every statement is idempotent.
--
--   2  Seller terms: shops.terms_accepted_at / terms_version. Owners cannot switch a listing live until accepted.
--   3  Own products: shop_listings.source 'own', barcode column. Photos live in the existing shop-media bucket.
--   4  Age-restricted: listing flag + kind, shop premises licence, customer 18+ confirmation, Challenge 25 ID check
--      before an order is marked collected or delivered.
--  11  £10/month shop subscription (no commission). Billing columns are written only by edge functions (service role).
--      Commission settings are switched off.
--  12  A listing can't be live at £0 (check constraint + friendly trigger message).
--  13  Customers only see live, priced listings from approved shops (RLS).

-- 0. Stripe Connect (card payments, already applied live on 19 Nov 2026) -------------------------------------------
-- Kept here so this release has a single migration. Every statement is idempotent, so re-running it is harmless.
-- Stripe Connect (test mode): shop payout account, card payment status, and pay at the shop.
-- Run this whole file once in the Supabase SQL editor. Safe to re-run.
-- Does not change an order total. A card refund cannot exceed what was paid on the card.
-- place_order keeps the same arguments. A [[pay:card]] tag in the note (removed before save)
-- marks the order as card; otherwise it is pay at the shop.

alter table public.shops add column if not exists stripe_account_id text;
alter table public.shops add column if not exists stripe_charges_enabled boolean not null default false;
create unique index if not exists shops_stripe_account_idx on public.shops (stripe_account_id) where stripe_account_id is not null;

alter table public.orders add column if not exists payment_status text not null default 'unpaid';
alter table public.orders add column if not exists stripe_payment_intent_id text;
alter table public.orders add column if not exists amount_paid numeric(10,2) not null default 0;
alter table public.orders add column if not exists amount_refunded numeric(10,2) not null default 0;
create unique index if not exists orders_stripe_pi_idx on public.orders (stripe_payment_intent_id) where stripe_payment_intent_id is not null;

alter table public.orders drop constraint if exists orders_payment_method_check;
alter table public.orders add constraint orders_payment_method_check
  check (payment_method in ('card','pay_at_shop','pay_on_collection','pay_on_delivery'));
alter table public.orders drop constraint if exists orders_payment_status_chk;
alter table public.orders add constraint orders_payment_status_chk
  check (payment_status in ('unpaid','authorised','paid','refunded','partially_refunded','failed'));
alter table public.orders drop constraint if exists orders_amount_paid_chk;
alter table public.orders add constraint orders_amount_paid_chk check (amount_paid >= 0);
alter table public.orders drop constraint if exists orders_amount_refunded_chk;
alter table public.orders add constraint orders_amount_refunded_chk
  check (amount_refunded >= 0 and amount_refunded <= amount_paid);

-- The customer, the shop owner and an admin can read an order. Writes stay on the RPCs and the service role.
drop policy if exists "orders read" on public.orders;
create policy "orders read" on public.orders for select using (
  customer_id = auth.uid() or is_admin()
  or exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid()));


create or replace function place_order(
  p_shop uuid, p_items jsonb, p_fulfilment text,
  p_name text, p_phone text, p_address text default null, p_postcode text default null,
  p_note text default null, p_lat double precision default null, p_lng double precision default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_shop shops%rowtype; v_order orders%rowtype;
  v_item jsonb; v_l shop_listings%rowtype; v_qty int; v_sub numeric(10,2) := 0; v_fee numeric(10,2) := 0;
  v_dist double precision; v_seen uuid[] := '{}';
  v_prep int := 15; v_travel int := 5; v_prom timestamptz; v_driver text;
  v_note text; v_tag text; v_pay text;
  v_lid_raw text; v_sku_raw text; v_from_cat boolean;
begin
  if v_uid is null then raise exception 'Please log in to place an order'; end if;
  if p_fulfilment not in ('collect','delivery') then raise exception 'Choose collection or delivery'; end if;
  if coalesce(trim(p_name),'') = '' or coalesce(trim(p_phone),'') = '' then raise exception 'Name and phone are required'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'Your basket is empty'; end if;
  if jsonb_array_length(p_items) > 50 then raise exception 'Too many items in one order'; end if;

  select * into v_shop from shops where id = p_shop;
  if not found or not v_shop.active or v_shop.status <> 'approved' then raise exception 'This shop is not taking orders right now'; end if;

  v_pay := substring(coalesce(p_note,'') from '\[\[pay:(card|shop)\]\]');
  v_note := regexp_replace(coalesce(p_note,''), '\s*\[\[window:[^]]+\]\]', '', 'g');
  v_note := regexp_replace(v_note, '\s*\[\[pay:[^]]+\]\]', '', 'g');
  v_tag := substring(coalesce(p_note,'') from '\[\[window:([^]]+)\]\]');

  if p_fulfilment = 'collect' and coalesce((v_shop.delivery_options->>'collect')::boolean, true) = false then
    raise exception 'This shop does not offer click & collect'; end if;
  if p_fulfilment = 'delivery' then
    if coalesce((v_shop.delivery_options->>'delivery')::boolean, false) = false then raise exception 'This shop does not deliver'; end if;
    if coalesce(trim(p_address),'') = '' then raise exception 'Delivery address is required'; end if;
    if p_lat is null or p_lng is null then raise exception 'Delivery postcode could not be located'; end if;
    if v_shop.lat is null or v_shop.lng is null then raise exception 'This shop has not set its location yet'; end if;
    v_dist := 3958.8 * 2 * asin(sqrt(power(sin(radians(p_lat - v_shop.lat)/2),2)
              + cos(radians(v_shop.lat)) * cos(radians(p_lat)) * power(sin(radians(p_lng - v_shop.lng)/2),2)));
    if v_dist > coalesce((v_shop.delivery_options->>'delivery_radius_miles')::numeric, 0) then
      raise exception 'Sorry, % is outside this shop''s delivery area', coalesce(p_postcode,'that address'); end if;
    v_fee := coalesce((v_shop.delivery_options->>'delivery_fee')::numeric, 0);
    begin
      v_prep := least(90, greatest(5, coalesce((v_shop.delivery_options->>'prep_minutes')::int, 15)));
    exception when others then
      v_prep := 15;
    end;
    v_travel := greatest(5, ceil(v_dist * 60.0 / 20.0)::int);
    v_prom := now() + ((v_prep + v_travel) * interval '1 minute');
    v_driver := case when v_shop.delivery_options->>'delivery_by' = 'shopnip' then 'shopnip' else 'shop' end;
    if v_driver = 'shopnip' and v_tag is not null and v_tag <> '' then
      begin
        v_prom := v_tag::timestamptz;
      exception when others then
        null;
      end;
    end if;
  end if;

  insert into orders(shop_id, customer_id, customer_name, customer_phone, customer_email, fulfilment, delivery_address, delivery_postcode,
                     note, payment_method, payment_status, status, delivery_fee,
                     delivery_lat, delivery_lng, shop_lat, shop_lng, distance_miles, prep_minutes, travel_minutes, promised_at, driver)
  values (p_shop, v_uid, trim(p_name), trim(p_phone), (select email from auth.users where id = v_uid), p_fulfilment,
          case when p_fulfilment = 'delivery' then trim(p_address) end, case when p_fulfilment = 'delivery' then upper(trim(p_postcode)) end,
          nullif(left(trim(coalesce(v_note,'')), 500), ''),
          case when v_pay = 'card' then 'card' else 'pay_at_shop' end, 'unpaid', 'placed', v_fee,
          case when p_fulfilment = 'delivery' then p_lat end, case when p_fulfilment = 'delivery' then p_lng end,
          case when p_fulfilment = 'delivery' then v_shop.lat end, case when p_fulfilment = 'delivery' then v_shop.lng end,
          case when p_fulfilment = 'delivery' then round(v_dist::numeric, 2) end,
          case when p_fulfilment = 'delivery' then v_prep end, case when p_fulfilment = 'delivery' then v_travel end,
          case when p_fulfilment = 'delivery' then v_prom end, v_driver)
  returning * into v_order;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'qty')::int;
    if v_qty is null or v_qty < 1 or v_qty > 99 then raise exception 'Invalid quantity'; end if;

    v_lid_raw := nullif(trim(coalesce(v_item->>'listing_id','')), '');
    v_sku_raw := nullif(trim(coalesce(v_item->>'sku','')), '');
    v_from_cat := false;

    if v_lid_raw is not null and v_lid_raw ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      select * into v_l from shop_listings where id = v_lid_raw::uuid for update;
      if not found or v_l.shop_id <> p_shop then raise exception 'An item in your basket is no longer available'; end if;
    else
      if v_lid_raw is not null and lower(v_lid_raw) like 'cat:%' then
        v_sku_raw := coalesce(nullif(substr(v_lid_raw, 5), ''), v_sku_raw);
        v_from_cat := true;
      end if;
      if coalesce(v_sku_raw,'') = '' then
        raise exception 'An item in your basket is no longer available';
      end if;
      select * into v_l from shop_listings where shop_id = p_shop and sku = v_sku_raw for update;
      if not found then
        if not exists (select 1 from shop_listings x where x.shop_id = p_shop and x.source = 'wholesale') then
          raise exception 'An item in your basket is no longer available';
        end if;
        insert into shop_listings(shop_id, sku, name, image, category, trade_price, retail_price, stock, active, source, updated_at)
        select p_shop, p.sku, p.name,
               case when jsonb_typeof(p.images) = 'array' then nullif(p.images->>0, '') else null end,
               p.category, p.trade_price, cp.retail_price,
               greatest(20, v_qty), true, 'wholesale', now()
        from products p
        join catalog_pricing cp on cp.sku = p.sku
        where p.sku = v_sku_raw and cp.retail_price is not null and cp.retail_price > 0
        on conflict (shop_id, sku) do nothing;
        select * into v_l from shop_listings where shop_id = p_shop and sku = v_sku_raw for update;
        if not found then raise exception 'An item in your basket is no longer available'; end if;
      end if;
      v_from_cat := true;
    end if;

    if (v_l.id = any(v_seen)) then raise exception 'Duplicate item in basket'; end if;
    v_seen := v_seen || v_l.id;
    -- Catalogue offers may point at an existing but inactive row. Sell against
    -- that row at its stored price; do not flip active (the shop hid it on purpose).
    -- Ordinary UUID checkout of a hidden listing still fails below.
    if v_from_cat then
      if v_l.retail_price is null or v_l.retail_price <= 0 then raise exception '% is no longer available', coalesce(v_l.name, v_l.sku); end if;
    else
      if not v_l.active or v_l.retail_price is null or v_l.retail_price <= 0 then raise exception '% is no longer available', v_l.name; end if;
    end if;
    if v_l.stock < v_qty then raise exception 'Only % left of %', v_l.stock, v_l.name; end if;
    update shop_listings set stock = stock - v_qty, updated_at = now() where id = v_l.id;
    insert into order_items(order_id, listing_id, sku, name, image, unit_price, qty)
    values (v_order.id, v_l.id, v_l.sku, coalesce(v_l.name, v_l.sku), v_l.image, v_l.retail_price, v_qty);
    v_sub := v_sub + v_l.retail_price * v_qty;
  end loop;

  update orders set subtotal = v_sub, total = v_sub + v_fee where id = v_order.id;
  insert into order_events(order_id, status, by_user) values (v_order.id, 'placed', v_uid);
  return jsonb_build_object(
    'id', v_order.id, 'order_number', 'NB-' || v_order.order_no, 'total', v_sub + v_fee,
    'distance_miles', case when p_fulfilment = 'delivery' then round(v_dist::numeric, 2) else null end,
    'prep_minutes', case when p_fulfilment = 'delivery' then v_prep else null end,
    'travel_minutes', case when p_fulfilment = 'delivery' then v_travel else null end,
    'promised_at', case when p_fulfilment = 'delivery' then v_prom else null end,
    'driver', v_driver, 'payment_method', case when v_pay = 'card' then 'card' else 'pay_at_shop' end, 'payment_status', 'unpaid');
end $$;

revoke all on function place_order(uuid,jsonb,text,text,text,text,text,text,double precision,double precision) from public, anon;
grant execute on function place_order(uuid,jsonb,text,text,text,text,text,text,double precision,double precision) to authenticated;

-- 1. Columns ---------------------------------------------------------------------------------------------------------
alter table shops add column if not exists terms_accepted_at timestamptz;
alter table shops add column if not exists terms_version text;
alter table shops add column if not exists alcohol_licence_number text;
alter table shops add column if not exists alcohol_licence_confirmed_at timestamptz;
alter table shops add column if not exists sub_status text not null default 'none';
alter table shops add column if not exists sub_trial_ends_at timestamptz;
alter table shops add column if not exists sub_current_period_end timestamptz;
alter table shops add column if not exists stripe_customer_id text;
alter table shops add column if not exists stripe_subscription_id text;
do $$ begin
  alter table shops add constraint shops_sub_status_chk check (sub_status in ('none','trialing','active','past_due','cancelled','unpaid','incomplete'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table shops add constraint shops_launch_len_chk check (coalesce(length(alcohol_licence_number),0) <= 60 and coalesce(length(terms_version),0) <= 20);
exception when duplicate_object then null; end $$;

alter table shop_listings add column if not exists age_restricted boolean not null default false;
alter table shop_listings add column if not exists age_kind text;
alter table shop_listings add column if not exists barcode text;
do $$ begin
  alter table shop_listings add constraint shop_listings_age_kind_chk check (age_kind is null or age_kind in ('alcohol','tobacco','vape','energy','knife','other'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table shop_listings add constraint shop_listings_barcode_chk check (barcode is null or barcode ~ '^[0-9]{6,14}$');
exception when duplicate_object then null; end $$;

alter table order_items add column if not exists age_restricted boolean not null default false;
alter table orders add column if not exists age_check_required boolean not null default false;
alter table orders add column if not exists age_confirmed_at timestamptz;
alter table orders add column if not exists id_checked_at timestamptz;
alter table orders add column if not exists id_checked_by uuid;

-- 2. Item 12: never live at £0 ------------------------------------------------------------------------------------------
update shop_listings set active = false where active and coalesce(retail_price, 0) <= 0;
do $$ begin
  alter table shop_listings add constraint shop_listings_live_price_chk check (not active or coalesce(retail_price, 0) > 0);
exception when duplicate_object then null; end $$;

-- 3. Age-restricted suggestion from name/category ---------------------------------------------------------------------
create or replace function age_kind_guess(p_name text, p_category text) returns text
language sql immutable as $$
  select case
    when t ~ '(^|[^a-z])(wine|beer|lager|cider|ale|stout|vodka|whisky|whiskey|gin|rum|brandy|tequila|liqueur|prosecco|champagne|spirits?|alcohol|alcopop|baileys|smirnoff|jack daniel|budweiser|stella artois|carlsberg|heineken|corona|guinness|kopparberg|strongbow|jagermeister|bacardi)([^a-z]|$)'
         and t !~ '(wine gum|non[- ]?alcoholic|alcohol[- ]free|0\.0%|ginger|gingerbread|root beer|rum ?(and|&) ?raisin|wine vinegar|rum baba|cider vinegar|beer[- ]battered)'
      then 'alcohol'
    when t ~ '(^|[^a-z])(cigarettes?|cigars?|tobacco|rolling papers?|rizla|cigarillos?|hand ?rolling)([^a-z]|$)' then 'tobacco'
    when t ~ '(^|[^a-z])(vapes?|e-?liquids?|e-?cig(arette)?s?|nicotine|elf ?bar|lost mary|disposable pod)([^a-z]|$)' then 'vape'
    when t ~ '(^|[^a-z])(energy drinks?|red bull|monster energy|relentless|rockstar energy|prime energy|boost energy|lucozade energy)([^a-z]|$)' then 'energy'
    when t ~ '(^|[^a-z])(lighter refill|butane|lighter gas|knife|knives|razor blades?|craft blades?|stanley blades?)([^a-z]|$)' then 'knife'
    else null end
  from (select lower(coalesce(p_name,'') || ' ' || coalesce(p_category,'')) as t) x
$$;

-- 4. Listing guard: suggestion on insert, terms + licence + price checks when the owner switches a listing live -------
create or replace function shop_listings_launch_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_shop shops%rowtype; v_going_live boolean; v_owner boolean;
begin
  if tg_op = 'INSERT' and new.age_kind is null then
    new.age_kind := age_kind_guess(new.name, new.category);
  end if;
  -- Energy drinks are only suggested (the seller decides); the rest are 18+ by law.
  if tg_op = 'INSERT' and new.age_kind in ('alcohol','tobacco','vape','knife') then
    new.age_restricted := true;
  end if;
  if new.age_kind in ('alcohol','tobacco','vape') then new.age_restricted := true; end if;   -- 18+ by law, can't be unticked
  if new.barcode is not null then new.barcode := nullif(regexp_replace(new.barcode, '\D', '', 'g'), ''); end if;

  v_going_live := new.active and (tg_op = 'INSERT' or not old.active);
  if not v_going_live then return new; end if;

  if coalesce(new.retail_price, 0) <= 0 then
    raise exception 'Set a price above £0 before switching % live', coalesce(new.name, new.sku);
  end if;

  -- Admins, the service role and server functions acting for a customer (place_order) are not blocked here.
  v_owner := auth.uid() is not null and not is_admin()
             and exists (select 1 from shops s where s.id = new.shop_id and s.owner_id = auth.uid());
  if not v_owner then return new; end if;

  select * into v_shop from shops where id = new.shop_id;
  if v_shop.terms_accepted_at is null then
    raise exception 'Accept the ShopNip seller terms before switching products live';
  end if;
  if new.age_kind = 'alcohol' and v_shop.alcohol_licence_confirmed_at is null then
    raise exception 'Confirm your premises licence in Settings before selling alcohol';
  end if;
  return new;
end $$;
drop trigger if exists shop_listings_launch_guard_trg on shop_listings;
create trigger shop_listings_launch_guard_trg before insert or update on shop_listings
  for each row execute function shop_listings_launch_guard();

-- Suggest age_kind for existing rows (does not change what is live).
update shop_listings set age_kind = age_kind_guess(name, category)
 where age_kind is null and age_kind_guess(name, category) is not null;
update shop_listings set age_restricted = true where age_kind in ('alcohol','tobacco','vape','knife') and not age_restricted;

-- 5. Shops: owners can't forge dates or billing; terms and licence dates are stamped by the server ---------------------
create or replace function shops_launch_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or is_admin() then return new; end if;   -- service role (edge functions) and admins
  if tg_op = 'INSERT' then
    if new.terms_accepted_at is not null then new.terms_accepted_at := now(); end if;
    if new.alcohol_licence_confirmed_at is not null then new.alcohol_licence_confirmed_at := now(); end if;
    new.sub_status := 'none'; new.sub_trial_ends_at := null; new.sub_current_period_end := null;
    new.stripe_customer_id := null; new.stripe_subscription_id := null;
    new.stripe_account_id := null; new.stripe_charges_enabled := false;
    return new;
  end if;
  if new.terms_accepted_at is distinct from old.terms_accepted_at then
    new.terms_accepted_at := case when new.terms_accepted_at is null then old.terms_accepted_at else now() end;
  end if;
  if new.alcohol_licence_confirmed_at is distinct from old.alcohol_licence_confirmed_at then
    new.alcohol_licence_confirmed_at := case when new.alcohol_licence_confirmed_at is null then null else now() end;
  end if;
  new.sub_status := old.sub_status; new.sub_trial_ends_at := old.sub_trial_ends_at;
  new.sub_current_period_end := old.sub_current_period_end;
  new.stripe_customer_id := old.stripe_customer_id; new.stripe_subscription_id := old.stripe_subscription_id;
  new.stripe_account_id := old.stripe_account_id; new.stripe_charges_enabled := old.stripe_charges_enabled;
  return new;
end $$;
drop trigger if exists shops_launch_guard_trg on shops;
create trigger shops_launch_guard_trg before insert or update on shops
  for each row execute function shops_launch_guard();

-- Withdrawing the licence takes alcohol offline straight away.
create or replace function shops_licence_withdrawn() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.alcohol_licence_confirmed_at is not null and new.alcohol_licence_confirmed_at is null then
    update shop_listings set active = false, updated_at = now() where shop_id = new.id and active and age_kind = 'alcohol';
  end if;
  return new;
end $$;
drop trigger if exists shops_licence_withdrawn_trg on shops;
create trigger shops_licence_withdrawn_trg after update of alcohol_licence_confirmed_at on shops
  for each row execute function shops_licence_withdrawn();

-- 6. Orders: customer 18+ confirmation and Challenge 25 ID check -----------------------------------------------------
-- The checkout adds [[age:18]] to the note when the customer ticks "I am 18 or over". It is stripped here.
create or replace function orders_age_tag() returns trigger
language plpgsql as $$
begin
  if coalesce(new.note,'') ~ '\[\[age:18\]\]' then
    new.age_confirmed_at := now();
    new.note := nullif(btrim(regexp_replace(new.note, '\s*\[\[age:18\]\]', '', 'g')), '');
  end if;
  return new;
end $$;
drop trigger if exists orders_age_tag_trg on orders;
create trigger orders_age_tag_trg before insert on orders for each row execute function orders_age_tag();

create or replace function order_items_age_check() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_flag boolean; v_name text; v_ok timestamptz;
begin
  select l.age_restricted, coalesce(l.name, l.sku) into v_flag, v_name from shop_listings l where l.id = new.listing_id;
  if coalesce(v_flag, false) then
    select age_confirmed_at into v_ok from orders where id = new.order_id;
    if v_ok is null then
      raise exception '% is age-restricted. Please confirm you are 18 or over at checkout', v_name;
    end if;
    new.age_restricted := true;
    update orders set age_check_required = true where id = new.order_id and not age_check_required;
  end if;
  return new;
end $$;
drop trigger if exists order_items_age_check_trg on order_items;
create trigger order_items_age_check_trg before insert on order_items for each row execute function order_items_age_check();

create or replace function orders_id_check_guard() returns trigger
language plpgsql as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed'
     and new.age_check_required and new.id_checked_at is null and auth.uid() is not null then
    raise exception 'Challenge 25: check the customer''s photo ID and tap ID checked before handing over this order';
  end if;
  return new;
end $$;
drop trigger if exists orders_id_check_guard_trg on orders;
create trigger orders_id_check_guard_trg before update of status on orders for each row execute function orders_id_check_guard();

create or replace function confirm_id_check(p_order uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_o orders%rowtype;
begin
  if auth.uid() is null then raise exception 'Please log in'; end if;
  select * into v_o from orders where id = p_order for update;
  if not found then raise exception 'Order not found'; end if;
  if not (is_admin() or exists (select 1 from shops s where s.id = v_o.shop_id and s.owner_id = auth.uid())) then
    raise exception 'Only the shop can record the ID check'; end if;
  if v_o.status not in ('accepted','picking','ready','out_for_delivery') then
    raise exception 'This order can''t be handed over from %', v_o.status; end if;
  update orders set id_checked_at = now(), id_checked_by = auth.uid(), updated_at = now() where id = p_order;
  return jsonb_build_object('id', p_order, 'id_checked_at', now());
end $$;
revoke all on function confirm_id_check(uuid) from public, anon;
grant execute on function confirm_id_check(uuid) to authenticated;

-- 7. Item 13: customers only see live, priced listings from approved shops --------------------------------------------
drop policy if exists "listings public read" on shop_listings;
create policy "listings public read" on shop_listings for select using (
  (active and retail_price > 0 and shop_is_public(shop_id)) or is_shop_owner(shop_id) or is_admin()
);

-- 8. Item 11: no commission; £10/month subscription replaces it ------------------------------------------------------
update marketplace_fee_settings set enabled = false, trade_selling_pct = 0, other_selling_pct = 0, updated_at = now() where id = 1;

create index if not exists shops_stripe_customer_idx on shops(stripe_customer_id) where stripe_customer_id is not null;
create index if not exists shop_listings_shop_barcode_idx on shop_listings(shop_id, barcode) where barcode is not null;

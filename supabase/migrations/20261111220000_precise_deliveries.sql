-- Precise deliveries: shop and customer coordinates, distance, promised time,
-- picking status, late notice, and private proof-of-delivery photos.
-- Run this whole file once in the Supabase SQL editor. Safe to re-run.
-- Needs place_order (migration_003) and update_order_status (migration_007).

-- 1. Columns -----------------------------------------------------------------
alter table shops add column if not exists location_source text;
alter table shops add column if not exists location_set_at timestamptz;
alter table shops drop constraint if exists shops_location_source_check;
alter table shops add constraint shops_location_source_check
  check (location_source is null or location_source in ('postcode','device'));

alter table orders add column if not exists delivery_lat double precision;
alter table orders add column if not exists delivery_lng double precision;
alter table orders add column if not exists shop_lat double precision;
alter table orders add column if not exists shop_lng double precision;
alter table orders add column if not exists distance_miles numeric(6,2);
alter table orders add column if not exists prep_minutes integer;
alter table orders add column if not exists travel_minutes integer;
alter table orders add column if not exists promised_at timestamptz;
alter table orders add column if not exists driver text;
alter table orders add column if not exists late_notified_at timestamptz;
alter table orders add column if not exists proof_path text;
alter table orders add column if not exists proof_name text;
alter table orders add column if not exists proof_at timestamptz;
alter table orders drop constraint if exists orders_driver_check;
alter table orders add constraint orders_driver_check
  check (driver is null or driver in ('shop','shopnip'));

alter table orders drop constraint if exists orders_status_check;
alter table orders add constraint orders_status_check
  check (status in ('placed','accepted','picking','ready','out_for_delivery','completed','cancelled','rejected'));

-- 2. place_order: same arguments as before, now stores the pin, distance and promise.
--    A ShopNip delivery window can override the promise via a [[window:ISO]] tag in the note.
--    That tag is removed before the note is saved. The order total is still set once, here.
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
  v_note text; v_tag text;
begin
  if v_uid is null then raise exception 'Please log in to place an order'; end if;
  if p_fulfilment not in ('collect','delivery') then raise exception 'Choose collection or delivery'; end if;
  if coalesce(trim(p_name),'') = '' or coalesce(trim(p_phone),'') = '' then raise exception 'Name and phone are required'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'Your basket is empty'; end if;
  if jsonb_array_length(p_items) > 50 then raise exception 'Too many items in one order'; end if;

  select * into v_shop from shops where id = p_shop;
  if not found or not v_shop.active or v_shop.status <> 'approved' then raise exception 'This shop is not taking orders right now'; end if;

  v_note := regexp_replace(coalesce(p_note,''), '\s*\[\[window:[^]]+\]\]', '', 'g');
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
                     note, payment_method, status, delivery_fee,
                     delivery_lat, delivery_lng, shop_lat, shop_lng, distance_miles, prep_minutes, travel_minutes, promised_at, driver)
  values (p_shop, v_uid, trim(p_name), trim(p_phone), (select email from auth.users where id = v_uid), p_fulfilment,
          case when p_fulfilment = 'delivery' then trim(p_address) end, case when p_fulfilment = 'delivery' then upper(trim(p_postcode)) end,
          nullif(left(trim(coalesce(v_note,'')), 500), ''),
          case when p_fulfilment = 'delivery' then 'pay_on_delivery' else 'pay_on_collection' end, 'placed', v_fee,
          case when p_fulfilment = 'delivery' then p_lat end, case when p_fulfilment = 'delivery' then p_lng end,
          case when p_fulfilment = 'delivery' then v_shop.lat end, case when p_fulfilment = 'delivery' then v_shop.lng end,
          case when p_fulfilment = 'delivery' then round(v_dist::numeric, 2) end,
          case when p_fulfilment = 'delivery' then v_prep end, case when p_fulfilment = 'delivery' then v_travel end,
          case when p_fulfilment = 'delivery' then v_prom end, v_driver)
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
  return jsonb_build_object(
    'id', v_order.id, 'order_number', 'NB-' || v_order.order_no, 'total', v_sub + v_fee,
    'distance_miles', case when p_fulfilment = 'delivery' then round(v_dist::numeric, 2) else null end,
    'prep_minutes', case when p_fulfilment = 'delivery' then v_prep else null end,
    'travel_minutes', case when p_fulfilment = 'delivery' then v_travel else null end,
    'promised_at', case when p_fulfilment = 'delivery' then v_prom else null end,
    'driver', v_driver);
end $$;

revoke all on function place_order(uuid,jsonb,text,text,text,text,text,text,double precision,double precision) from public, anon;
grant execute on function place_order(uuid,jsonb,text,text,text,text,text,text,double precision,double precision) to authenticated;

-- 3. Status: picking sits between accepted and out for delivery.
--    A delivery cannot be marked delivered here until proof is on the order.
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
         or (v_o.status = 'accepted' and v_o.fulfilment = 'delivery' and p_status in ('picking','out_for_delivery'))
         or (v_o.status = 'picking' and p_status in ('out_for_delivery','cancelled'))
         or (v_o.status in ('ready','out_for_delivery') and p_status in ('completed','cancelled'));
  end if;
  if not v_ok and v_o.customer_id = v_uid then
    v_ok := v_o.status = 'placed' and p_status = 'cancelled';
  end if;
  if not v_ok then raise exception 'Cannot change this order from % to %', v_o.status, p_status; end if;

  if p_status = 'completed' and v_o.fulfilment = 'delivery'
     and v_o.proof_path is null and coalesce(btrim(v_o.proof_name),'') = '' then
    raise exception 'Add a doorstep photo or the name of who took it before marking this delivered';
  end if;

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

-- 4. Proof, then delivered. Photo path or a recipient name is required. Total is not touched.
create or replace function save_delivery_proof(p_order uuid, p_path text default null, p_name text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_o orders%rowtype; v_name text := nullif(left(btrim(coalesce(p_name,'')), 80), '');
  v_path text := nullif(btrim(coalesce(p_path,'')), '');
begin
  if v_uid is null then raise exception 'Please log in'; end if;
  select * into v_o from orders where id = p_order for update;
  if not found then raise exception 'Order not found'; end if;
  if not (exists (select 1 from shops where id = v_o.shop_id and owner_id = v_uid) or is_admin()) then
    raise exception 'Only the shop can record proof of delivery'; end if;
  if v_o.fulfilment <> 'delivery' then raise exception 'This order is not a delivery'; end if;
  if v_o.status not in ('accepted','picking','out_for_delivery') then
    raise exception 'This order cannot be marked delivered from %', v_o.status; end if;
  if v_path is not null and v_path <> (v_o.shop_id::text || '/' || v_o.id::text || '/proof.jpg') then
    raise exception 'Photo could not be saved'; end if;
  if v_path is null and v_name is null then
    raise exception 'Add a doorstep photo or the name of who took it'; end if;
  update orders set status = 'completed', updated_at = now(),
         proof_path = v_path, proof_name = v_name, proof_at = now()
   where id = p_order;
  insert into order_events(order_id, status, note, by_user)
  values (p_order, 'completed', case when v_name is not null then 'Delivered to ' || v_name else 'Doorstep photo saved' end, v_uid);
  return jsonb_build_object('id', p_order, 'status', 'completed');
end $$;

revoke all on function save_delivery_proof(uuid, text, text) from public, anon;
grant execute on function save_delivery_proof(uuid, text, text) to authenticated;

-- 5. One late notice, once the promise is more than 15 minutes behind.
create or replace function note_delivery_late(p_order uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_o orders%rowtype;
begin
  if v_uid is null then raise exception 'Please log in'; end if;
  select * into v_o from orders where id = p_order for update;
  if not found then raise exception 'Order not found'; end if;
  if not (v_o.customer_id = v_uid or is_admin()
          or exists (select 1 from shops where id = v_o.shop_id and owner_id = v_uid)) then
    raise exception 'Not allowed'; end if;
  if v_o.fulfilment <> 'delivery' or v_o.status in ('completed','rejected','cancelled')
     or v_o.promised_at is null or now() <= v_o.promised_at + interval '15 minutes'
     or v_o.late_notified_at is not null then
    return jsonb_build_object('late', v_o.late_notified_at is not null);
  end if;
  update orders set late_notified_at = now(), updated_at = now() where id = p_order;
  insert into order_events(order_id, status, note, by_user)
  values (p_order, v_o.status, 'Running late. The customer has been told.', v_uid);
  return jsonb_build_object('late', true);
end $$;

revoke all on function note_delivery_late(uuid) from public, anon;
grant execute on function note_delivery_late(uuid) to authenticated;

-- 6. Private proof photos: shop id / order id / proof.jpg
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('delivery-proof', 'delivery-proof', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "delivery proof upload" on storage.objects;
create policy "delivery proof upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'delivery-proof' and (
    is_admin() or exists (select 1 from shops s where s.id::text = (storage.foldername(name))[1] and s.owner_id = auth.uid())));

drop policy if exists "delivery proof replace" on storage.objects;
create policy "delivery proof replace" on storage.objects for update to authenticated
  using (bucket_id = 'delivery-proof' and (
    is_admin() or exists (select 1 from shops s where s.id::text = (storage.foldername(name))[1] and s.owner_id = auth.uid())));

drop policy if exists "delivery proof read" on storage.objects;
create policy "delivery proof read" on storage.objects for select to authenticated
  using (bucket_id = 'delivery-proof' and (
    is_admin()
    or exists (select 1 from shops s where s.id::text = (storage.foldername(name))[1] and s.owner_id = auth.uid())
    or exists (select 1 from orders o where o.id::text = (storage.foldername(name))[2] and o.customer_id = auth.uid())));

-- Allow checkout of catalogue offers (basket listing_id like cat:16398).
-- The shop page fills in wholesale catalogue SKUs that are not in the shop's
-- *active* listings, using a cat:<sku> id. Those SKUs often already have a
-- shop_listings row (sometimes inactive). place_order used to cast listing_id
-- straight to uuid, which raised: invalid input syntax for type uuid: "cat:16398".
--
-- This keeps prices on the server (shop_listings, or catalog_pricing when a
-- row has to be created). The function signature is unchanged. Order totals
-- are still set once, here, and only go down after that.

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
  v_lid_raw text; v_sku_raw text; v_from_cat boolean;
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
    'driver', v_driver);
end $$;

revoke all on function place_order(uuid,jsonb,text,text,text,text,text,text,double precision,double precision) from public, anon;
grant execute on function place_order(uuid,jsonb,text,text,text,text,text,text,double precision,double precision) to authenticated;

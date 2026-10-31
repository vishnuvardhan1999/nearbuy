-- Welcome offer: free delivery on a customer's first order.
-- The fee stays on the shop for later orders. Cancelled and rejected orders do not use up the offer.
-- Run in the Supabase SQL editor after migration 003. Prices still come from shop_listings, never the client.

create or replace function place_order(
  p_shop uuid, p_items jsonb, p_fulfilment text,
  p_name text, p_phone text, p_address text default null, p_postcode text default null,
  p_note text default null, p_lat double precision default null, p_lng double precision default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_shop shops%rowtype; v_order orders%rowtype;
  v_item jsonb; v_l shop_listings%rowtype; v_qty int; v_sub numeric(10,2) := 0; v_fee numeric(10,2) := 0;
  v_dist double precision; v_seen uuid[] := '{}'; v_first boolean;
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
    select not exists (
      select 1 from orders
      where customer_id = v_uid and status not in ('cancelled','rejected')
    ) into v_first;
    if v_first then v_fee := 0; end if;
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
  return jsonb_build_object('id', v_order.id, 'order_number', 'NB-' || v_order.order_no, 'total', v_sub + v_fee, 'delivery_fee', v_fee, 'welcome_delivery', v_fee = 0 and p_fulfilment = 'delivery');
end $$;

revoke all on function place_order(uuid,jsonb,text,text,text,text,text,text,double precision,double precision) from public, anon;
grant execute on function place_order(uuid,jsonb,text,text,text,text,text,text,double precision,double precision) to authenticated;

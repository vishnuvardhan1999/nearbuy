-- Stock-check results and substitution preference are currently only kept in
-- the seller's browser (rel.js / localStorage nb_rel). This makes them
-- server-side truth: out-of-stock items are marked on the order, subtotal and
-- total are recalculated downward only (never more than was placed), and
-- "Ask me first" holds the order until the customer answers.
--
-- Do not apply automatically. Existing completed orders (including NB-1011)
-- are left as they are; they can be corrected by a shop or support refund
-- after this is applied, if needed.

-- 1. Columns ---------------------------------------------------------------
alter table public.orders
  add column if not exists sub_pref text,
  add column if not exists cancel_if_key boolean not null default false,
  add column if not exists awaiting_customer boolean not null default false,
  add column if not exists total_at_place numeric(10,2),
  add column if not exists stock_checked_at timestamptz;

update public.orders set sub_pref = 'ask' where sub_pref is null;
update public.orders set total_at_place = total where total_at_place is null;

alter table public.orders alter column sub_pref set default 'ask';
alter table public.orders alter column sub_pref set not null;

do $$ begin
  alter table public.orders
    add constraint orders_sub_pref_chk check (sub_pref in ('refund','swap','ask'));
exception when duplicate_object then null;
end $$;

alter table public.order_items
  add column if not exists is_key boolean not null default false,
  add column if not exists in_stock boolean,
  add column if not exists unavailable boolean not null default false,
  add column if not exists swap_name text,
  add column if not exists swap_price numeric(10,2),
  add column if not exists swap_accepted boolean not null default false;

do $$ begin
  alter table public.order_items
    add constraint order_items_swap_price_chk
    check (swap_price is null or swap_price >= 0);
exception when duplicate_object then null;
end $$;

-- 2. Totals may only go down; don't complete while waiting for the customer
create or replace function shopnip_orders_stock_guard()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    if new.total_at_place is null then new.total_at_place := new.total; end if;
    return new;
  end if;
  if new.total_at_place is distinct from old.total_at_place
     and new.total_at_place > coalesce(old.total_at_place, old.total) then
    new.total_at_place := coalesce(old.total_at_place, old.total);
  end if;
  if new.subtotal > old.subtotal then new.subtotal := old.subtotal; end if;
  if new.total > old.total then new.total := old.total; end if;
  if new.total_at_place is not null and new.total > new.total_at_place then
    new.total := new.total_at_place;
  end if;
  if old.awaiting_customer is true
     and new.status is distinct from old.status
     and new.status in ('ready','out_for_delivery','completed') then
    raise exception 'This order is waiting for the customer to choose what happens to out-of-stock items';
  end if;
  return new;
end $$;

drop trigger if exists trg_orders_stock_guard on public.orders;
create trigger trg_orders_stock_guard
  before insert or update on public.orders
  for each row execute function shopnip_orders_stock_guard();

-- 3. Recalculate goods subtotal + total, only downward
create or replace function shopnip_recalc_order_totals(p_order uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_o public.orders%rowtype;
  v_sub numeric(10,2);
  v_total numeric(10,2);
  v_cap numeric(10,2);
begin
  select * into v_o from public.orders where id = p_order for update;
  if not found then raise exception 'Order not found'; end if;
  select coalesce(sum(
    case
      when i.unavailable then 0
      when i.swap_accepted then round(least(coalesce(i.swap_price, i.unit_price), i.unit_price) * i.qty, 2)
      else round(i.unit_price * i.qty, 2)
    end
  ), 0) into v_sub
  from public.order_items i where i.order_id = p_order;
  v_total := round(v_sub + coalesce(v_o.delivery_fee, 0), 2);
  v_cap := least(
    coalesce(v_o.total, v_total),
    coalesce(v_o.total_at_place, v_o.total, v_total)
  );
  if v_total > v_cap then v_total := v_cap; end if;
  if v_sub > coalesce(v_o.subtotal, v_sub) then v_sub := v_o.subtotal; end if;
  update public.orders
     set subtotal = v_sub, total = v_total, updated_at = now()
   where id = p_order;
  return jsonb_build_object('subtotal', v_sub, 'total', v_total);
end $$;

revoke all on function shopnip_recalc_order_totals(uuid) from public, anon, authenticated;

-- 4. Customer records their substitution preference just after placing
create or replace function set_order_substitution(
  p_order uuid,
  p_pref text,
  p_cancel_if_key boolean default false,
  p_key_listing_ids text[] default '{}')
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_o public.orders%rowtype;
  v_pref text := lower(btrim(coalesce(p_pref, 'ask')));
begin
  if v_uid is null then raise exception 'Please log in'; end if;
  if v_pref not in ('refund','swap','ask') then raise exception 'Choose refund, swap, or ask me first'; end if;
  select * into v_o from public.orders where id = p_order for update;
  if not found then raise exception 'Order not found'; end if;
  if v_o.customer_id is distinct from v_uid and not is_admin() then
    raise exception 'Only the customer can set this';
  end if;
  if v_o.status <> 'placed' then
    raise exception 'The substitution choice is already locked in';
  end if;
  update public.orders
     set sub_pref = v_pref,
         cancel_if_key = coalesce(p_cancel_if_key, false),
         updated_at = now()
   where id = p_order;
  update public.order_items
     set is_key = (p_key_listing_ids is not null and listing_id::text = any (p_key_listing_ids))
   where order_id = p_order;
  return jsonb_build_object('id', p_order, 'sub_pref', v_pref, 'cancel_if_key', coalesce(p_cancel_if_key, false));
end $$;

revoke all on function set_order_substitution(uuid, text, boolean, text[]) from public, anon;
grant execute on function set_order_substitution(uuid, text, boolean, text[]) to authenticated;

-- 5. Seller stock check on accept
create or replace function accept_order_stock_check(p_order uuid, p_stock jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_o public.orders%rowtype;
  v_row jsonb;
  v_item public.order_items%rowtype;
  v_in boolean;
  v_swap_name text;
  v_swap_price numeric(10,2);
  v_awaiting boolean := false;
  v_key_cancel boolean := false;
  v_any_in boolean := false;
  v_pending int := 0;
  v_goods numeric(10,2);
  v_money jsonb;
  v_note text;
  v_names text := '';
begin
  if v_uid is null then raise exception 'Please log in'; end if;
  select * into v_o from public.orders where id = p_order for update;
  if not found then raise exception 'Order not found'; end if;
  if not (exists (select 1 from public.shops where id = v_o.shop_id and owner_id = v_uid) or is_admin()) then
    raise exception 'Only the shop can check stock on this order';
  end if;
  if v_o.status <> 'placed' then
    raise exception 'Stock has already been checked on this order, or it is no longer waiting';
  end if;
  if p_stock is null or jsonb_typeof(p_stock) <> 'array' then
    raise exception 'Check each item';
  end if;

  for v_row in select * from jsonb_array_elements(p_stock)
  loop
    select * into v_item from public.order_items
      where order_id = p_order and id = (v_row->>'id')::uuid;
    if not found then raise exception 'An item on this stock check does not belong to the order'; end if;
    v_in := coalesce((v_row->>'in_stock')::boolean, false);
    v_swap_name := nullif(btrim(coalesce(v_row->>'swap_name','')), '');
    begin
      v_swap_price := nullif(v_row->>'swap_price','')::numeric;
    exception when others then
      v_swap_price := null;
    end;
    if v_in then
      v_any_in := true;
      update public.order_items
         set in_stock = true, unavailable = false,
             swap_name = null, swap_price = null, swap_accepted = false
       where id = v_item.id;
    else
      if v_item.is_key and v_o.cancel_if_key then
        v_key_cancel := true;
      end if;
      v_names := v_names || case when v_names = '' then '' else ', ' end || v_item.name;
      if v_o.sub_pref = 'refund' then
        update public.order_items
           set in_stock = false, unavailable = true,
               swap_name = null, swap_price = null, swap_accepted = false
         where id = v_item.id;
      elsif v_o.sub_pref = 'swap' and v_swap_name is not null and v_swap_price is not null
            and v_swap_price <= v_item.unit_price then
        update public.order_items
           set in_stock = false, unavailable = false,
               swap_name = left(v_swap_name, 200), swap_price = v_swap_price, swap_accepted = true
         where id = v_item.id;
        v_any_in := true;
      elsif v_o.sub_pref = 'ask' then
        v_awaiting := true;
        update public.order_items
           set in_stock = false, unavailable = false,
               swap_name = case when v_swap_name is not null and v_swap_price is not null and v_swap_price <= v_item.unit_price then left(v_swap_name, 200) else null end,
               swap_price = case when v_swap_name is not null and v_swap_price is not null and v_swap_price <= v_item.unit_price then v_swap_price else null end,
               swap_accepted = false
         where id = v_item.id;
      else
        -- swap pref but no valid swap: take it off the total
        update public.order_items
           set in_stock = false, unavailable = true,
               swap_name = null, swap_price = null, swap_accepted = false
         where id = v_item.id;
      end if;
    end if;
  end loop;

  if v_key_cancel then
    update public.shop_listings l set stock = l.stock + i.qty, updated_at = now()
      from public.order_items i where i.order_id = p_order and i.listing_id = l.id;
    update public.orders
       set status = 'cancelled',
           cancel_reason = 'stock',
           cancel_note = 'Key item out of stock',
           cancelled_by = v_uid,
           cancelled_role = 'seller',
           cancelled_at = now(),
           awaiting_customer = false,
           stock_checked_at = now(),
           updated_at = now()
     where id = p_order;
    perform shopnip_recalc_order_totals(p_order);
    -- cancelled goods should not stay on the bill
    update public.orders set subtotal = 0, total = 0, updated_at = now() where id = p_order and total > 0;
    -- the guard may leave total at the previous amount if it thinks this is an increase from 0;
    -- we already lowered or zeroed only downward via a direct set: if guard blocks 0>old, it's fine.
    insert into public.order_events(order_id, status, note, by_user)
    values (p_order, 'cancelled', 'Key item out of stock', v_uid);
    select jsonb_build_object('id', o.id, 'status', o.status, 'subtotal', o.subtotal, 'total', o.total,
                              'awaiting_customer', o.awaiting_customer, 'stock_checked_at', o.stock_checked_at)
      into v_money from public.orders o where o.id = p_order;
    return v_money;
  end if;

  if not v_any_in and not v_awaiting then
    update public.shop_listings l set stock = l.stock + i.qty, updated_at = now()
      from public.order_items i where i.order_id = p_order and i.listing_id = l.id;
    update public.orders
       set status = 'rejected',
           reject_reason = 'Nothing in stock',
           awaiting_customer = false,
           stock_checked_at = now(),
           updated_at = now()
     where id = p_order;
    perform shopnip_recalc_order_totals(p_order);
    insert into public.order_events(order_id, status, note, by_user)
    values (p_order, 'rejected', 'Nothing in stock', v_uid);
    select jsonb_build_object('id', o.id, 'status', o.status, 'subtotal', o.subtotal, 'total', o.total,
                              'awaiting_customer', o.awaiting_customer, 'stock_checked_at', o.stock_checked_at)
      into v_money from public.orders o where o.id = p_order;
    return v_money;
  end if;

  select count(*) into v_pending
    from public.order_items
   where order_id = p_order and in_stock is false and not unavailable and not swap_accepted;
  v_awaiting := v_pending > 0;

  select coalesce(sum(case when unavailable then 0 when swap_accepted then round(least(coalesce(swap_price, unit_price), unit_price)*qty, 2) else round(unit_price*qty, 2) end), 0)
    into v_goods from public.order_items where order_id = p_order;

  if not v_awaiting and v_goods = 0 then
    update public.shop_listings l set stock = l.stock + i.qty, updated_at = now()
      from public.order_items i where i.order_id = p_order and i.listing_id = l.id;
    update public.orders
       set status = 'rejected',
           reject_reason = 'Nothing in stock',
           awaiting_customer = false,
           stock_checked_at = now(),
           updated_at = now()
     where id = p_order;
    perform shopnip_recalc_order_totals(p_order);
    insert into public.order_events(order_id, status, note, by_user)
    values (p_order, 'rejected', 'Nothing in stock', v_uid);
    select jsonb_build_object('id', o.id, 'status', o.status, 'subtotal', o.subtotal, 'total', o.total,
                              'awaiting_customer', o.awaiting_customer, 'stock_checked_at', o.stock_checked_at)
      into v_money from public.orders o where o.id = p_order;
    return v_money;
  end if;

  update public.orders
     set status = 'accepted',
         awaiting_customer = v_awaiting,
         stock_checked_at = now(),
         updated_at = now()
   where id = p_order;
  v_money := shopnip_recalc_order_totals(p_order);
  v_note := case
    when v_awaiting then 'Accepted, but '||v_names||' out of stock. Waiting for the customer to choose (or the shop must contact them).'
    when v_names <> '' then 'Accepted. Out of stock: '||v_names||'. Total reduced to goods still on the order.'
    else 'Accepted. Every item is in stock.'
  end;
  insert into public.order_events(order_id, status, note, by_user)
  values (p_order, 'accepted', v_note, v_uid);

  return (select jsonb_build_object(
    'id', o.id, 'status', o.status, 'subtotal', o.subtotal, 'total', o.total,
    'awaiting_customer', o.awaiting_customer, 'stock_checked_at', o.stock_checked_at,
    'note', v_note
  ) from public.orders o where o.id = p_order);
end $$;

revoke all on function accept_order_stock_check(uuid, jsonb) from public, anon;
grant execute on function accept_order_stock_check(uuid, jsonb) to authenticated;

-- 6. Customer answers an "ask me first" item
create or replace function choose_order_item(p_order uuid, p_item uuid, p_choice text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_o public.orders%rowtype;
  v_item public.order_items%rowtype;
  v_choice text := lower(btrim(coalesce(p_choice, '')));
  v_pending int;
  v_wait boolean;
begin
  if v_uid is null then raise exception 'Please log in'; end if;
  if v_choice not in ('refund','swap') then raise exception 'Choose a refund or a swap'; end if;
  select * into v_o from public.orders where id = p_order for update;
  if not found then raise exception 'Order not found'; end if;
  if v_o.customer_id is distinct from v_uid and not is_admin() then
    raise exception 'Only the customer can choose';
  end if;
  if v_o.status in ('cancelled','rejected') then raise exception 'This order is no longer open'; end if;
  if not v_o.awaiting_customer then raise exception 'Nothing is waiting for a choice on this order'; end if;
  select * into v_item from public.order_items where id = p_item and order_id = p_order for update;
  if not found then raise exception 'Item not found'; end if;
  if v_item.in_stock is not false or v_item.unavailable or v_item.swap_accepted then
    raise exception 'This item is not waiting for a choice';
  end if;
  if v_choice = 'swap' then
    if v_item.swap_name is null or v_item.swap_price is null or v_item.swap_price > v_item.unit_price then
      raise exception 'There is no swap at the same price or less for this item';
    end if;
    update public.order_items
       set swap_accepted = true, unavailable = false
     where id = v_item.id;
  else
    update public.order_items
       set unavailable = true, swap_accepted = false
     where id = v_item.id;
  end if;
  select count(*) into v_pending
    from public.order_items
   where order_id = p_order and in_stock is false and not unavailable and not swap_accepted;
  v_wait := v_pending > 0;
  update public.orders
     set awaiting_customer = v_wait, updated_at = now()
   where id = p_order;
  perform shopnip_recalc_order_totals(p_order);
  insert into public.order_events(order_id, status, note, by_user)
  values (p_order, v_o.status,
          case when v_choice = 'swap' then 'Customer accepted swap: '||v_item.name||' → '||v_item.swap_name
               else 'Customer asked to take '||v_item.name||' off the total' end,
          v_uid);
  return (select jsonb_build_object(
    'id', o.id, 'status', o.status, 'subtotal', o.subtotal, 'total', o.total,
    'awaiting_customer', o.awaiting_customer
  ) from public.orders o where o.id = p_order);
end $$;

revoke all on function choose_order_item(uuid, uuid, text) from public, anon;
grant execute on function choose_order_item(uuid, uuid, text) to authenticated;

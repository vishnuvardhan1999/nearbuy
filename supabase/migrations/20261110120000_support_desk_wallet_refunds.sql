-- ShopNip · Support desk + wallet refunds per order line.
-- Run once in the Supabase SQL editor AFTER migration_010_wallet.sql (needs wallets, wallet_post, is_admin). Safe to re-run.
--
-- What it adds
--   * order_refund_lines      one row per refunded order line (or the delivery fee). Unique per line, so a line can
--                             never be refunded twice.
--   * refund_order_lines()    shop owner or admin refunds whole order / chosen lines to the customer's ShopNip wallet,
--                             capped at what the customer has actually paid.
--   * refund_order_to_wallet() (manual refund button) now uses the same cap.
--   * support_cases           problems raised by customers ("Report a problem") and sellers (Support tab).
--   * support_replies         the conversation on a case.
--   * take_support_case() / reply_support_case() / resolve_support_case()   admin actions, one owner per case.
--   * private storage bucket  support-photos  (<user id>/<case id>.jpg)
--
-- TODO(card refunds): ShopNip has no card provider yet, so every refund here is ShopNip wallet credit. When card
-- payments go live, refund_lines_internal() must send the card-paid share back through the provider instead of the wallet.

-- 1. Per-line refund ledger -------------------------------------------------------------
create table if not exists order_refund_lines (
  id          bigserial primary key,
  order_id    uuid not null references orders(id) on delete cascade,
  order_item_id uuid references order_items(id) on delete cascade,
  part        text not null check (part in ('item','delivery')),
  line_amount numeric(10,2) not null check (line_amount >= 0),
  credited    numeric(10,2) not null default 0 check (credited >= 0),
  source      text not null check (source in ('declined','out_of_stock','cancelled','support')),
  reason      text,
  created_by  uuid,
  created_at  timestamptz not null default now(),
  check ((part = 'item') = (order_item_id is not null))
);
create unique index if not exists order_refund_lines_item_uq on order_refund_lines(order_item_id) where order_item_id is not null;
create unique index if not exists order_refund_lines_delivery_uq on order_refund_lines(order_id) where part = 'delivery';
create index if not exists order_refund_lines_order_idx on order_refund_lines(order_id);

alter table order_refund_lines enable row level security;
drop policy if exists "refund lines read" on order_refund_lines;
create policy "refund lines read" on order_refund_lines for select using (
  exists (select 1 from orders o where o.id = order_id and (o.customer_id = auth.uid() or is_admin()
    or exists (select 1 from shops s where s.id = o.shop_id and s.owner_id = auth.uid()))));
revoke insert, update, delete on order_refund_lines from anon, authenticated;

-- What the customer has actually paid and not yet had back.
-- No card payments yet: before completion only wallet money has been paid; on completion the full total was paid at the shop.
create or replace function order_refundable_left(p_order uuid) returns numeric
language sql stable security definer set search_path = public as $$
  select greatest(0, (case when o.status = 'completed' then o.total else o.wallet_applied end)
                     - o.refunded_to_wallet
                     - case when o.wallet_reversed then o.wallet_applied else 0 end)::numeric(10,2)
  from orders o where o.id = p_order
$$;
revoke all on function order_refundable_left(uuid) from public, anon;
grant execute on function order_refundable_left(uuid) to authenticated;

-- Internal: refund lines (p_items null = every line not yet refunded + the delivery fee). Not callable by clients.
create or replace function refund_lines_internal(p_order uuid, p_items uuid[], p_reason text, p_source text, p_by uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_o orders%rowtype; v_i record; v_ids bigint[] := '{}'; v_id bigint;
        v_items numeric(10,2) := 0; v_fee numeric(10,2) := 0; v_lines numeric(10,2); v_credit numeric(10,2) := 0;
        v_left numeric(10,2); v_cut numeric(10,2); v_sub_cut numeric(10,2); v_rem numeric(10,2); v_reason text;
begin
  select * into v_o from orders where id = p_order for update;          -- serialises refunds on the same order
  if not found then raise exception 'Order not found'; end if;
  if p_items is not null and (cardinality(p_items) = 0 or exists (
       select 1 from unnest(p_items) x where not exists (select 1 from order_items i where i.id = x and i.order_id = p_order))) then
    raise exception 'Choose items from this order to refund'; end if;
  v_reason := nullif(left(trim(coalesce(p_reason,'')), 200), '');

  for v_i in select i.id, round(i.unit_price * i.qty, 2) as amt from order_items i
              where i.order_id = p_order and (p_items is null or i.id = any(p_items))
                and not exists (select 1 from order_refund_lines r where r.order_item_id = i.id)
              order by i.id loop
    insert into order_refund_lines(order_id, order_item_id, part, line_amount, source, reason, created_by)
    values (p_order, v_i.id, 'item', v_i.amt, p_source, v_reason, p_by) returning id into v_id;
    v_ids := v_ids || v_id; v_items := v_items + v_i.amt;
  end loop;
  if p_items is null and v_o.delivery_fee > 0
     and not exists (select 1 from order_refund_lines where order_id = p_order and part = 'delivery') then
    insert into order_refund_lines(order_id, part, line_amount, source, reason, created_by)
    values (p_order, 'delivery', v_o.delivery_fee, p_source, v_reason, p_by) returning id into v_id;
    v_ids := v_ids || v_id; v_fee := v_o.delivery_fee;
  end if;
  v_lines := v_items + v_fee;
  if cardinality(v_ids) = 0 then
    return jsonb_build_object('order_id', p_order, 'lines', 0, 'credited', 0, 'already_refunded', true);
  end if;

  -- money back: never more than the customer has paid (and not already had back)
  v_left := order_refundable_left(p_order);
  if v_o.customer_id is not null then v_credit := least(v_lines, v_left); end if;
  if v_credit > 0 then
    perform wallet_post(v_o.customer_id, v_credit, 'refund', p_order,
      'Refund for order ' || coalesce(v_o.order_number, v_o.id::text) || coalesce(' · ' || v_reason, ''), p_by);
    update orders set refunded_to_wallet = refunded_to_wallet + v_credit, updated_at = now() where id = p_order;
    v_rem := v_credit;
    for v_id in select unnest(v_ids) loop
      exit when v_rem <= 0;
      update order_refund_lines set credited = least(line_amount, v_rem) where id = v_id returning credited into v_cut;
      v_rem := v_rem - v_cut;
    end loop;
  end if;

  -- the part not yet paid comes off what the customer pays at collection / delivery
  v_cut := v_lines - v_credit;
  if v_cut > 0 and v_o.status in ('placed','accepted','ready','out_for_delivery') then
    v_sub_cut := least(v_items, v_cut);
    update orders set subtotal = greatest(0, subtotal - v_sub_cut),
                      delivery_fee = greatest(0, delivery_fee - (v_cut - v_sub_cut)),
                      total = greatest(0, total - v_cut), updated_at = now()
     where id = p_order;
  end if;

  insert into order_events(order_id, status, note, by_user)
  values (p_order, 'refunded_to_wallet',
          case when v_credit > 0 then '£' || v_credit::text || ' refunded to ShopNip wallet' else '£' || v_lines::text || ' taken off the order (not paid yet)' end
          || coalesce(' · ' || v_reason, ''), p_by);
  return jsonb_build_object('order_id', p_order, 'lines', cardinality(v_ids), 'line_total', v_lines,
                            'credited', v_credit, 'taken_off_total', case when v_o.status in ('placed','accepted','ready','out_for_delivery') then v_lines - v_credit else 0 end);
end $$;
revoke all on function refund_lines_internal(uuid,uuid[],text,text,uuid) from public, anon, authenticated;

-- Public: shop owner or admin. Used on decline, out-of-stock and cancel.
create or replace function refund_order_lines(p_order uuid, p_items uuid[] default null, p_reason text default null, p_source text default 'out_of_stock')
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_o orders%rowtype;
begin
  if v_uid is null then raise exception 'Please log in'; end if;
  select * into v_o from orders where id = p_order;
  if not found then raise exception 'Order not found'; end if;
  if not (is_admin() or exists (select 1 from shops where id = v_o.shop_id and owner_id = v_uid)) then
    raise exception 'Only the shop or ShopNip admin can refund this order'; end if;
  if p_source not in ('declined','out_of_stock','cancelled','support') then raise exception 'Unknown refund reason'; end if;
  if p_source = 'support' and not is_admin() then raise exception 'Support refunds are made by ShopNip'; end if;
  if p_source = 'declined' and v_o.status <> 'rejected' then raise exception 'Decline the order first'; end if;
  if p_source = 'cancelled' and v_o.status <> 'cancelled' then raise exception 'Cancel the order first'; end if;
  if p_source = 'out_of_stock' and p_items is null then raise exception 'Choose the items that are out of stock'; end if;
  return refund_lines_internal(p_order, p_items, p_reason, p_source, v_uid);
end $$;
revoke all on function refund_order_lines(uuid,uuid[],text,text) from public, anon;
grant execute on function refund_order_lines(uuid,uuid[],text,text) to authenticated;

-- Manual "Refund to wallet" (seller inbox + admin): same cap as above, replacing the total-based cap from migration 010.
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
  v_max := order_refundable_left(p_order);
  if v_max <= 0 then raise exception 'Nothing to refund: the customer hasn''t paid for this order yet'; end if;
  if v_amt > v_max then raise exception 'You can refund at most £% on this order (what the customer has paid)', v_max; end if;

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

-- 2. Support cases ---------------------------------------------------------------------
create table if not exists support_cases (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid references orders(id) on delete set null,
  raised_by     text not null check (raised_by in ('customer','seller')),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  shop_id       uuid references shops(id) on delete set null,
  message       text not null check (length(message) between 1 and 2000),
  photo_path    text,
  status        text not null default 'open' check (status in ('open','owned','resolved')),
  owner         uuid references auth.users(id) on delete set null,
  owner_email   text,
  owned_at      timestamptz,
  needs_admin   boolean not null default true,          -- drives the admin unread badge
  resolution    text,
  refund_amount numeric(10,2) not null default 0,
  resolved_at   timestamptz,
  admin_alerted_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  reply_due_at  timestamptz not null default (now() + interval '2 hours')
);
create index if not exists support_cases_status_idx on support_cases(status, created_at desc);
create index if not exists support_cases_user_idx on support_cases(user_id, created_at desc);
-- one open case per order per person
create unique index if not exists support_cases_one_open_uq on support_cases(order_id, user_id) where status <> 'resolved' and order_id is not null;

create table if not exists support_replies (
  id          bigserial primary key,
  case_id     uuid not null references support_cases(id) on delete cascade,
  author      uuid references auth.users(id) on delete set null,
  author_role text not null check (author_role in ('admin','customer','seller')),
  body        text not null check (length(body) between 1 and 2000),
  created_at  timestamptz not null default now()
);
create index if not exists support_replies_case_idx on support_replies(case_id, created_at);

-- the client may only choose order/shop/message/photo; everything else is set here
create or replace function support_cases_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_o orders%rowtype;
begin
  if v_uid is null then raise exception 'Please log in'; end if;
  new.user_id := v_uid; new.status := 'open'; new.owner := null; new.owner_email := null; new.owned_at := null;
  new.needs_admin := true; new.resolution := null; new.refund_amount := 0; new.resolved_at := null; new.admin_alerted_at := null;
  new.created_at := now(); new.updated_at := now(); new.reply_due_at := new.created_at + interval '2 hours';
  new.message := left(trim(coalesce(new.message,'')), 2000);
  if new.message = '' then raise exception 'Please tell us what went wrong'; end if;
  if new.photo_path is not null and new.photo_path not like v_uid::text || '/%' then raise exception 'That photo can''t be attached'; end if;
  if new.order_id is not null then
    select * into v_o from orders where id = new.order_id;
    if not found then raise exception 'Order not found'; end if;
  end if;
  if new.raised_by = 'customer' then
    if new.order_id is null or v_o.customer_id is distinct from v_uid then raise exception 'You can only report a problem with your own order'; end if;
    new.shop_id := v_o.shop_id;
  elsif new.raised_by = 'seller' then
    if new.order_id is not null then new.shop_id := v_o.shop_id; end if;
    if new.shop_id is null or not exists (select 1 from shops where id = new.shop_id and owner_id = v_uid) then
      raise exception 'You can only raise cases for your own shop'; end if;
  else
    raise exception 'Unknown case type';
  end if;
  return new;
end $$;
drop trigger if exists support_cases_before_insert_trg on support_cases;
create trigger support_cases_before_insert_trg before insert on support_cases
  for each row execute function support_cases_before_insert();

alter table support_cases enable row level security;
alter table support_replies enable row level security;
drop policy if exists "support cases read own" on support_cases;
create policy "support cases read own" on support_cases for select using (user_id = auth.uid() or is_admin());
drop policy if exists "support cases insert own" on support_cases;
create policy "support cases insert own" on support_cases for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "support replies read" on support_replies;
create policy "support replies read" on support_replies for select using (
  is_admin() or exists (select 1 from support_cases c where c.id = case_id and c.user_id = auth.uid()));
-- updates and replies only through the functions below
revoke update, delete on support_cases from anon, authenticated;
revoke insert, update, delete on support_replies from anon, authenticated;

-- Admin: take ownership. Only one owner per case.
create or replace function take_support_case(p_case uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_c support_cases%rowtype;
begin
  if not is_admin() then raise exception 'Admins only'; end if;
  update support_cases set owner = v_uid, owner_email = (select email from auth.users where id = v_uid),
         status = 'owned', owned_at = now(), updated_at = now()
   where id = p_case and owner is null and status = 'open' returning * into v_c;
  if not found then
    select * into v_c from support_cases where id = p_case;
    if not found then raise exception 'Case not found'; end if;
    if v_c.owner is distinct from v_uid then raise exception 'Another admin already owns this case'; end if;
  end if;
  return to_jsonb(v_c);
end $$;

-- Reply: the owning admin (an unowned case is taken on first reply), or the person who raised it.
create or replace function reply_support_case(p_case uuid, p_body text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_c support_cases%rowtype; v_role text; v_body text := left(trim(coalesce(p_body,'')), 2000);
begin
  if v_uid is null then raise exception 'Please log in'; end if;
  if v_body = '' then raise exception 'Write a reply first'; end if;
  select * into v_c from support_cases where id = p_case for update;
  if not found then raise exception 'Case not found'; end if;
  if is_admin() and v_c.user_id <> v_uid then
    if v_c.owner is null then perform take_support_case(p_case);
    elsif v_c.owner <> v_uid then raise exception 'Another admin owns this case'; end if;
    v_role := 'admin';
    update support_cases set needs_admin = false, updated_at = now() where id = p_case;
  elsif v_c.user_id = v_uid then
    if v_c.status = 'resolved' then raise exception 'This case is closed. Please report a new problem.'; end if;
    v_role := v_c.raised_by;
    update support_cases set needs_admin = true, updated_at = now() where id = p_case;
  else
    raise exception 'Not your case';
  end if;
  insert into support_replies(case_id, author, author_role, body) values (p_case, v_uid, v_role, v_body);
  return jsonb_build_object('case_id', p_case, 'role', v_role);
end $$;

-- Resolve, optionally with a wallet refund. p_refund: 'none' | 'order' (whole order) | 'items' (p_items).
create or replace function resolve_support_case(p_case uuid, p_note text default null, p_refund text default 'none', p_items uuid[] default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_c support_cases%rowtype; v_r jsonb := '{}'::jsonb; v_note text := nullif(left(trim(coalesce(p_note,'')), 2000), '');
begin
  if not is_admin() then raise exception 'Admins only'; end if;
  select * into v_c from support_cases where id = p_case for update;
  if not found then raise exception 'Case not found'; end if;
  if v_c.status = 'resolved' then raise exception 'This case is already resolved'; end if;
  if v_c.owner is null then perform take_support_case(p_case);
  elsif v_c.owner <> v_uid then raise exception 'Another admin owns this case'; end if;
  if coalesce(p_refund,'none') not in ('none','order','items') then raise exception 'Unknown refund choice'; end if;
  if p_refund <> 'none' then
    if v_c.order_id is null then raise exception 'This case has no order to refund'; end if;
    if p_refund = 'items' and coalesce(cardinality(p_items),0) = 0 then raise exception 'Choose the items to refund'; end if;
    v_r := refund_lines_internal(v_c.order_id, case when p_refund = 'order' then null else p_items end,
                                 'Support case ' || left(v_c.id::text, 8), 'support', v_uid);
  end if;
  if v_note is not null then
    insert into support_replies(case_id, author, author_role, body) values (p_case, v_uid, 'admin', v_note);
  end if;
  update support_cases set status = 'resolved', resolved_at = now(), updated_at = now(), needs_admin = false,
         resolution = coalesce(v_note, case when p_refund = 'none' then 'Resolved' else 'Refunded' end),
         refund_amount = refund_amount + coalesce((v_r->>'credited')::numeric, 0)
   where id = p_case;
  return jsonb_build_object('case_id', p_case, 'refund', v_r);
end $$;

revoke all on function take_support_case(uuid) from public, anon;
revoke all on function reply_support_case(uuid,text) from public, anon;
revoke all on function resolve_support_case(uuid,text,text,uuid[]) from public, anon;
grant execute on function take_support_case(uuid) to authenticated;
grant execute on function reply_support_case(uuid,text) to authenticated;
grant execute on function resolve_support_case(uuid,text,text,uuid[]) to authenticated;

-- 3. Private photo bucket: <user id>/<case id>.jpg ---------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('support-photos', 'support-photos', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "support photos upload own" on storage.objects;
create policy "support photos upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'support-photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "support photos read own or admin" on storage.objects;
create policy "support photos read own or admin" on storage.objects for select to authenticated
  using (bucket_id = 'support-photos' and ((storage.foldername(name))[1] = auth.uid()::text or is_admin()));

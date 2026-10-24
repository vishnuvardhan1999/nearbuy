-- Nearbuy (a NuvonHub product) · Phase 2 migration: shop side.
-- Run ONCE in Supabase SQL editor after schema.sql. Safe to re-run (idempotent where possible).

-- 1. Profiles (shopper / owner) --------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text, full_name text,
  role text not null default 'shopper' check (role in ('shopper','owner')),
  created_at timestamptz default now()
);
alter table profiles enable row level security;
drop policy if exists "profiles self" on profiles;
create policy "profiles self" on profiles for select using (id = auth.uid());
drop policy if exists "profiles self update" on profiles;
create policy "profiles self update" on profiles for update using (id = auth.uid()) with check (id = auth.uid());

create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles(id,email,full_name,role)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name',
          case when new.raw_user_meta_data->>'role' = 'owner' then 'owner' else 'shopper' end)
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

-- 2. Admins ----------------------------------------------------------------
create table if not exists admins (email text primary key);
alter table admins enable row level security;   -- no policies: only readable via is_admin()
-- >>> EDIT THIS LINE to vishnu's login email before running:
insert into admins(email) values ('vishnuvardhan.kesavarapu@outlook.com') on conflict do nothing;

create or replace function is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where lower(email) = lower(coalesce(auth.jwt()->>'email','')));
$$;

-- 3. Shops: extra columns + approval status --------------------------------
alter table shops add column if not exists status text not null default 'pending';
alter table shops drop constraint if exists shops_status_check;
alter table shops add constraint shops_status_check check (status in ('pending','approved','rejected','suspended'));
alter table shops add column if not exists phone text;
alter table shops add column if not exists opening_hours text;
alter table shops add column if not exists logo_url text;
alter table shops add column if not exists cover_url text;
alter table shops add column if not exists approved_at timestamptz;
create index if not exists shops_trade_email_idx on shops (lower(bluepark_customer_email));
create unique index if not exists shops_one_per_owner on shops(owner_id);

-- Owners cannot approve themselves: status is forced to pending on insert and frozen on update unless admin.
create or replace function shops_guard() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if is_admin() or auth.uid() is null then          -- admin, or SQL editor / service role
    if new.status = 'approved' and (tg_op = 'INSERT' or old.status <> 'approved') then new.approved_at := now(); end if;
    return new;
  end if;
  if tg_op = 'INSERT' then new.status := 'pending'; new.approved_at := null;
  else new.status := old.status; new.approved_at := old.approved_at; new.owner_id := old.owner_id;
       -- changing the trade email sends the shop back for review
       if lower(coalesce(new.bluepark_customer_email,'')) <> lower(coalesce(old.bluepark_customer_email,'')) then new.status := 'pending'; end if;
  end if;
  return new;
end $$;
drop trigger if exists shops_guard_trg on shops;
create trigger shops_guard_trg before insert or update on shops for each row execute function shops_guard();

drop policy if exists "shops public read" on shops;
create policy "shops public read" on shops for select using ((active and status = 'approved') or owner_id = auth.uid() or is_admin());
drop policy if exists "shops admin update" on shops;
create policy "shops admin update" on shops for update using (is_admin()) with check (is_admin());

-- 4. Listings: no FK to products; copy display fields in ---------------------
alter table shop_listings drop constraint if exists shop_listings_sku_fkey;
alter table shop_listings add column if not exists name text;
alter table shop_listings add column if not exists image text;
alter table shop_listings add column if not exists category text;
alter table shop_listings add column if not exists trade_price numeric(10,2);
alter table shop_listings add column if not exists source text not null default 'manual';  -- manual | wholesale

drop policy if exists "listings public read" on shop_listings;
create policy "listings public read" on shop_listings for select using (
  (active and exists (select 1 from shops s where s.id = shop_id and s.active and s.status = 'approved'))
  or exists (select 1 from shops s where s.id = shop_id and s.owner_id = auth.uid())
  or is_admin());
-- "listings owner write" from schema.sql still applies (owner of the shop only).

-- 5. Wholesale orders → auto-listing ----------------------------------------
create table if not exists wholesale_orders (
  id bigserial primary key,
  order_ref text,
  trade_email text not null,
  sku text not null,
  qty integer not null check (qty > 0),
  shipped_at timestamptz,
  name text, image text, category text, trade_price numeric(10,2),
  shop_id uuid references shops(id),           -- filled by the trigger when matched
  imported_at timestamptz default now(),
  unique (order_ref, sku)
);
alter table wholesale_orders enable row level security;
drop policy if exists "wholesale owner read" on wholesale_orders;
create policy "wholesale owner read" on wholesale_orders for select using (
  is_admin() or exists (select 1 from shops s where s.id = shop_id and s.owner_id = auth.uid()));
-- Inserts are done from the SQL editor (bypasses RLS), so no insert policy for the browser.

create or replace function apply_wholesale_order() returns trigger language plpgsql security definer set search_path = public as $$
declare s record; p record;
begin
  if new.shipped_at is null then return new; end if;
  select sku,name,images->>0 as image,category,trade_price into p from products where sku = new.sku;  -- optional; products may be empty
  for s in select id from shops where lower(bluepark_customer_email) = lower(new.trade_email) and status <> 'rejected' loop
    insert into shop_listings(shop_id, sku, name, image, category, trade_price, retail_price, stock, active, source)
    values (s.id, new.sku, coalesce(new.name,p.name,new.sku), coalesce(new.image,p.image), coalesce(new.category,p.category),
            coalesce(new.trade_price,p.trade_price), round(coalesce(new.trade_price,p.trade_price,0) * 1.5, 2), new.qty, true, 'wholesale')
    on conflict (shop_id, sku) do update set
      stock = shop_listings.stock + excluded.stock,
      trade_price = coalesce(excluded.trade_price, shop_listings.trade_price),
      name = coalesce(shop_listings.name, excluded.name),
      image = coalesce(shop_listings.image, excluded.image),
      updated_at = now();
    new.shop_id := s.id;
  end loop;
  return new;
end $$;
drop trigger if exists wholesale_orders_apply on wholesale_orders;
create trigger wholesale_orders_apply before insert on wholesale_orders for each row execute function apply_wholesale_order();
-- Duplicate rows (same order_ref + sku) are skipped by the import's ON CONFLICT DO NOTHING, so stock is not double-counted.

-- When a shop registers AFTER its orders were imported, back-fill its listings:
create or replace function backfill_shop_listings(p_shop uuid) returns integer language plpgsql security definer set search_path = public as $$
declare n integer := 0; w record; em text;
begin
  select lower(bluepark_customer_email) into em from shops where id = p_shop and (owner_id = auth.uid() or is_admin() or auth.uid() is null);
  if em is null then return 0; end if;
  for w in select sku, max(name) name, max(image) image, max(category) category, max(trade_price) tp, sum(qty) q
           from wholesale_orders where lower(trade_email) = em and shipped_at is not null and shop_id is null group by sku loop
    insert into shop_listings(shop_id,sku,name,image,category,trade_price,retail_price,stock,active,source)
    values (p_shop,w.sku,coalesce(w.name,w.sku),w.image,w.category,w.tp,round(coalesce(w.tp,0)*1.5,2),w.q,true,'wholesale')
    on conflict (shop_id,sku) do update set stock = shop_listings.stock + excluded.stock;
    n := n + 1;
  end loop;
  update wholesale_orders set shop_id = p_shop where lower(trade_email) = em and shop_id is null;
  return n;
end $$;

-- 6. Storage bucket for logos / covers --------------------------------------
insert into storage.buckets (id, name, public) values ('shop-media','shop-media', true) on conflict (id) do nothing;
drop policy if exists "shop-media public read" on storage.objects;
create policy "shop-media public read" on storage.objects for select using (bucket_id = 'shop-media');
drop policy if exists "shop-media owner write" on storage.objects;
create policy "shop-media owner write" on storage.objects for insert to authenticated
  with check (bucket_id = 'shop-media' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "shop-media owner update" on storage.objects;
create policy "shop-media owner update" on storage.objects for update to authenticated
  using (bucket_id = 'shop-media' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "shop-media owner delete" on storage.objects;
create policy "shop-media owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'shop-media' and (storage.foldername(name))[1] = auth.uid()::text);

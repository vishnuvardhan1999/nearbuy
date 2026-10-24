-- Nearbuy Phase 1 schema. Run in Supabase SQL editor, then run products-seed.sql.
create extension if not exists pgcrypto;

create table if not exists products (
  sku text primary key,
  name text not null,
  description text,
  images jsonb not null default '[]'::jsonb,
  category text,
  trade_price numeric(10,2),
  updated_at timestamptz default now()
);

create table if not exists shops (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  address text,
  postcode text,
  lat double precision,
  lng double precision,
  bluepark_customer_email text,
  delivery_options jsonb not null default '{"collect":true,"delivery":false,"delivery_radius_miles":0,"delivery_fee":0}'::jsonb,
  active boolean not null default true,
  created_at timestamptz default now()
);
create index if not exists shops_owner_idx on shops(owner_id);

create table if not exists shop_listings (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  sku text not null references products(sku),
  retail_price numeric(10,2) not null check (retail_price >= 0),
  stock integer not null default 0,
  active boolean not null default true,
  updated_at timestamptz default now(),
  unique (shop_id, sku)
);
create index if not exists listings_sku_idx on shop_listings(sku);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id),
  customer_id uuid references auth.users(id),
  customer_name text, customer_phone text, customer_email text,
  fulfilment text not null default 'collect' check (fulfilment in ('collect','delivery')),
  delivery_address text,
  status text not null default 'new' check (status in ('new','accepted','ready','out_for_delivery','completed','cancelled')),
  total numeric(10,2) not null default 0,
  created_at timestamptz default now()
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  listing_id uuid references shop_listings(id),
  sku text not null, name text not null,
  unit_price numeric(10,2) not null, qty integer not null check (qty > 0)
);

alter table products enable row level security;
alter table shops enable row level security;
alter table shop_listings enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;

-- Catalogue: everyone reads; writes only via service role (seed / sync).
create policy "products public read" on products for select using (true);

-- Shops: public reads active shops; owners manage their own.
create policy "shops public read" on shops for select using (active or owner_id = auth.uid());
create policy "shops owner insert" on shops for insert with check (owner_id = auth.uid());
create policy "shops owner update" on shops for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "shops owner delete" on shops for delete using (owner_id = auth.uid());

-- Listings: public reads active listings in active shops; owners manage their own shop's listings.
create policy "listings public read" on shop_listings for select using (
  (active and exists (select 1 from shops s where s.id = shop_id and s.active))
  or exists (select 1 from shops s where s.id = shop_id and s.owner_id = auth.uid()));
create policy "listings owner write" on shop_listings for all
  using (exists (select 1 from shops s where s.id = shop_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from shops s where s.id = shop_id and s.owner_id = auth.uid()));

-- Orders: signed-in customers create and read their own; shop owners read/update orders for their shop.
create policy "orders customer insert" on orders for insert with check (customer_id = auth.uid());
create policy "orders read" on orders for select using (
  customer_id = auth.uid() or exists (select 1 from shops s where s.id = shop_id and s.owner_id = auth.uid()));
create policy "orders shop update" on orders for update using (
  exists (select 1 from shops s where s.id = shop_id and s.owner_id = auth.uid()));
create policy "order_items read" on order_items for select using (
  exists (select 1 from orders o where o.id = order_id and (o.customer_id = auth.uid()
    or exists (select 1 from shops s where s.id = o.shop_id and s.owner_id = auth.uid()))));
create policy "order_items customer insert" on order_items for insert with check (
  exists (select 1 from orders o where o.id = order_id and o.customer_id = auth.uid()));

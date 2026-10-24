-- Nearbuy · migration 004: promotions (banners, sponsored products, featured shops, deals),
-- compare-at ("was") prices on listings, newsletter subscribers, promo image storage.
-- Safe to re-run. Requires migration_002 (is_admin(), shop-media bucket).

-- 1. compare-at price on listings
alter table shop_listings add column if not exists compare_at_price numeric(10,2);
alter table shop_listings drop constraint if exists shop_listings_compare_at_chk;
alter table shop_listings add constraint shop_listings_compare_at_chk check (compare_at_price is null or compare_at_price >= 0);

-- 2. promotions
create table if not exists promotions (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('banner','sponsored','featured_shop','deal')),
  title text not null,
  subtitle text,
  image text,
  link text,                         -- e.g. #sell, #shop=<id>, #about or a full https:// URL
  cta text,                          -- button label
  sku text,                          -- sponsored / deal: the product promoted
  shop_id uuid references shops(id) on delete cascade,   -- featured_shop / sponsored
  placement text not null default 'hero' check (placement in ('hero','mid')),   -- banners: hero carousel or mid-page banner
  theme text check (theme is null or theme in ('teal','coral','lime','night','gold')),
  start_at timestamptz not null default now(),
  end_at timestamptz,
  priority integer not null default 0,
  active boolean not null default true,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint promotions_dates_chk check (end_at is null or end_at > start_at)
);
create index if not exists promotions_live_idx on promotions (type, priority desc) where active;

create or replace function promotions_touch() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists promotions_touch on promotions;
create trigger promotions_touch before update on promotions for each row execute function promotions_touch();

alter table promotions enable row level security;
drop policy if exists "promotions public read" on promotions;
create policy "promotions public read" on promotions for select
  using ((active and start_at <= now() and (end_at is null or end_at > now())) or is_admin());
drop policy if exists "promotions admin insert" on promotions;
create policy "promotions admin insert" on promotions for insert to authenticated with check (is_admin());
drop policy if exists "promotions admin update" on promotions;
create policy "promotions admin update" on promotions for update to authenticated using (is_admin()) with check (is_admin());
drop policy if exists "promotions admin delete" on promotions;
create policy "promotions admin delete" on promotions for delete to authenticated using (is_admin());
grant select on promotions to anon, authenticated;
grant insert, update, delete on promotions to authenticated;

-- 3. newsletter subscribers: anyone may insert, nobody may read via the API (admins use the dashboard / SQL)
create table if not exists subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(email) <= 254),
  postcode text check (postcode is null or length(postcode) <= 10),
  source text default 'home' check (source is null or length(source) <= 40),
  consent boolean not null default true check (consent),
  user_id uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index if not exists subscribers_email_uq on subscribers (lower(email));
alter table subscribers enable row level security;
drop policy if exists "subscribers insert" on subscribers;
create policy "subscribers insert" on subscribers for insert to anon, authenticated with check (consent);
drop policy if exists "subscribers admin read" on subscribers;
create policy "subscribers admin read" on subscribers for select to authenticated using (is_admin());
grant insert on subscribers to anon, authenticated;
grant select on subscribers to authenticated;

-- 4. storage: admins upload promo images to shop-media/promos/
drop policy if exists "shop-media promos admin write" on storage.objects;
create policy "shop-media promos admin write" on storage.objects for insert to authenticated
  with check (bucket_id = 'shop-media' and (storage.foldername(name))[1] = 'promos' and is_admin());
drop policy if exists "shop-media promos admin update" on storage.objects;
create policy "shop-media promos admin update" on storage.objects for update to authenticated
  using (bucket_id = 'shop-media' and (storage.foldername(name))[1] = 'promos' and is_admin());
drop policy if exists "shop-media promos admin delete" on storage.objects;
create policy "shop-media promos admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'shop-media' and (storage.foldername(name))[1] = 'promos' and is_admin());

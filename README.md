# ShopNip – Phase 1
\nA NuvonHub product.

Local marketplace PWA. Suman Bros trade customers each get a shop. Products they bought are listed from wholesaler data, they set retail prices, and local shoppers order for click & collect or delivery.
Plain static files (no build step), the same pattern as ecity-temple: supabase-js from a CDN, keys in `config.js`.

## Files
index.html, style.css, app.js, config.js, manifest.json, sw.js (service worker, must stay at root), icon-180/192/512.png, vercel.json,
products.json (demo catalogue), schema.sql, products-seed.sql.

## Deploy
1. **GitHub**: create a new repo (e.g. `nearbuy`). Use *Add file → Upload files* and drag in every file in this folder (keep them at the repo root). Commit.
2. **Supabase**: create a new project (London region). In SQL Editor, run `schema.sql`, then `products-seed.sql` (it is large, so if the editor struggles, split it in halves; it uses upsert so re-running is safe).
   Under Authentication, enable Email sign-in.
3. **config.js**: from Project Settings → API, paste the Project URL and anon/publishable key into `config.js` (edit it in the GitHub web UI). The anon key is safe in the browser because RLS protects the data. Never use the service_role key.
4. **Vercel**: New Project → Import the GitHub repo → Framework preset "Other", no build command, output dir = root → Deploy. Every later commit redeploys automatically.
5. Add a custom domain in Vercel if wanted.

## Demo mode
While `config.js` holds the placeholders, or Supabase returns no listings, the app loads `products.json` with illustrative prices (trade × 1.6) and labelled sample shops.

## Regenerating the catalogue
`python3 build-products.py` (on a machine with the CSV) reads the Bluepark export and rewrites products.json and products-seed.sql. It keeps only Active=1, not discontinued rows, strips HTML/JSON-LD from descriptions and points images at https://www.sumanbros.com/user/products/large/…

## Next (Phase 2)
Shop owner sign-up (match on Bluepark customer email), auto-listing purchased SKUs, price editing, checkout writing to orders/order_items, and postcode → lat/lng distance sorting (postcodes.io).

---
# Phase 2: shop side

New files: `p2.js` (auth, register shop, My shop dashboard, public shop page `/#shop=<id>`), `migration_002_phase2.sql`, `import-orders.py`.
Changed: `app.js` (real approved shops + listing prices on the homepage), `index.html` (loads p2.js), `style.css`, `sw.js` (cache v4).

## Deploy steps
1. **SQL**: open `migration_002_phase2.sql`, replace `REPLACE_WITH_VISHNU_EMAIL` with the admin's login email, then run the whole file in Supabase → SQL Editor.
   It adds: `profiles` (+ signup trigger), `admins` + `is_admin()`, shop columns `status/phone/opening_hours/logo_url/cover_url/approved_at`,
   an approval guard trigger, display columns on `shop_listings` (FK to products dropped), `wholesale_orders` + auto-listing trigger,
   `backfill_shop_listings()`, the public `shop-media` storage bucket and its policies.
2. The operator dashboard is a separate site (see `../admin/README.md`).
3. **Supabase → Authentication → URL configuration**: Site URL = your Vercel URL (e.g. `https://www.shopnip.co.uk`); add it and `http://localhost:8765` to Redirect URLs.
4. **Authentication → Providers → Email**: enabled. "Confirm email" ON is recommended (the app tells users to check their inbox, then log in). Turn it OFF only for quick testing.
   The built-in mailer is rate-limited (a few emails/hour); set up custom SMTP before launch.
5. Upload the changed files to GitHub; Vercel redeploys.

## Importing wholesaler orders (auto-listing)
1. In Bluepark admin export orders (order lines) as CSV.
2. `python3 import-orders.py orders.csv --list-columns` to check the guessed columns; override any with `--email/--sku/--qty/--shipped/--ref/--status` (or `--items` for a combined items column).
3. `python3 import-orders.py orders.csv --since 2026-10-01 > orders.sql`, then run `orders.sql` in the SQL editor.
   Each shipped line adds stock to the matching shop's listing (matched on the trade email entered at registration); new items get retail = trade × 1.5.
   Lines for emails with no shop yet are stored and back-filled when that shop registers.

## Local preview with mock data (no Supabase writes)
`python3 -m http.server 8765` then open e.g. `/?mock=1&as=owner&view=myshop`, `&view=register&shop=none`, `&view=addprod`, `/?mock=1&as=owner#shop=s1`.

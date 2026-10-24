# Nearbuy – Phase 1

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

-- Opening hours stay in shops.opening_hours (text). No rewrite of existing rows.
-- Shoppers already saved a readable summary such as
--   Mon 10am-6pm, Tue 10am-8pm, Sat closed, Sun 10am-2pm
-- The site reads that text and also JSON v2 written by the registration
-- and shop-settings forms:
--   {"v":2,"tz":"Europe/London","days":[...],"holidays":[...],"summary":"..."}
-- Open/closed is computed in the browser for Europe/London, including
-- British Summer Time. Re-run is safe.

comment on column shops.opening_hours is
  'Weekly hours as JSON v2 or a legacy summary string. Open/closed is computed for Europe/London.';

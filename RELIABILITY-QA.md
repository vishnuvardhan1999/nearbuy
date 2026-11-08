# Order reliability: how to try it (preview, mock mode)

Start: `python3 serve-preview.py 8099` in /workspace/pr4. Add `&fast=1` to any URL for short timers
(accept deadline 1 min, SMS/WhatsApp at 15 s, call at 35 s, shop case reply 1 min). Without it: 15 min / 3 min / 8 min / 2 h.
The customer tab, seller tab and support desk share state through localStorage (`nb_rel`), so use the same browser.
Reset: `localStorage.removeItem('nb_rel')` in the console.

Customer: http://127.0.0.1:8099/?mock=1&fast=1&as=shopper  ·  Seller: http://127.0.0.1:8099/seller.html?mock=1&fast=1#orders  ·  Desk: http://127.0.0.1:8099/support.html

1. Stock check on accept. Customer: add 2–3 items from Corner News & Stationers → checkout → Place order (number NB-2004+).
   Seller → Orders: the order appears (from the customer tab) → Accept opens a sheet listing each item with In stock / Not in stock
   (and a same-price-or-cheaper swap picker) → Confirm. Customer order page (Track order) shows the result straight away.
2. Substitution choice. Checkout panel "If something is out of stock": Refund it / Swap for the same price or less / Ask me first,
   plus tick boxes for key items ("cancel the whole order if this is out"). Saved on the order. Ask me first → customer sees
   Swap / Refund it per item and a Cancel order button. Key item out + cancel ticked → order cancelled and refunded automatically.
   Dearer swaps are never offered by the shop picker; if one ever exists the customer must press "Yes, swap for £x".
3. Total only goes down. `REL.recompute` caps at the placed total unless the customer said yes to a dearer swap; the order page shows
   "Was £x when you ordered. Totals only ever go down."
4. No auto-accept + escalation. Seller with fast=1: leave NB-1011/NB-1012 untouched. Toasts: sound + banner → SMS/WhatsApp reminder
   (P33.escalate) → phone call → at the deadline the order is declined, the customer is told and refunded now. The order drawer shows
   "Accept by HH:MM" and the alerts sent so far; preview link "skip to the deadline".
5. Pause / busy. Bar at the top of Overview and Orders: "Open: taking orders" / "Paused / busy". 2 missed orders in a row → auto-pause
   with the reason shown; "Reopen shop" unpauses. While paused, customer checkout shows "This shop is busy right now" and Place order is disabled.
   Declining an order yourself or accepting one resets the missed count.
6. Delivery status. Seller drawer of a delivery order (e.g. NB-1010): Accepted → Start picking → Out for delivery → Delivered, with
   "Promised by HH:MM" and "your own driver / ShopNip driver". Customer order page shows the same bar and promised time.
   Late: more than 15 min past the promised time and not delivered → automatic "running late" notice (customer page link "skip 16 minutes" to test).
7. Proof of delivery. On a delivery order, Delivered opens a sheet: doorstep photo (camera) or name of the person. Neither → it won't mark delivered.
   Proof is saved on the order; seller drawer, customer page and support desk show it.
8. Report a problem. Customer order page (accepted or later) → Report a problem → type, item, note, photo → Send. Shop owns it:
   seller drawer shows Resend item / Refund it. No reply by the deadline (customer page "shop doesn't reply" link) → ShopNip owns it;
   support.html shows the case with Resend / Refund. The customer is never told to contact someone else.
9. Fast refunds. Every decline, timeout, key-item cancel, out-of-stock line and case refund writes a refund immediately and tells the customer
   "Refunded now". If a wallet module (`window.WAL.refund` / `WAL.credit`) is loaded it is credited there.
10. Phone-first. All new sheets are bottom sheets with 44px+ buttons, tested at 390px. No tablet, hardware or rate-change copy.

## Files changed
- rel.js (new): all of the above, customer + seller + desk.
- support.html (new): ShopNip support desk (preview, noindex).
- p33.js: added `escalate()` (reminder/call) and `notifyCustomer()`; existing alert prefs untouched. Live: calls the order-alert function with event `reminder` / `call` / `customer_*` (that edge function still needs those events handled).
- p3.js: mock order numbers start at NB-2001 (avoid clashing with seller preview numbers); p33.js?v=rel1.
- index.html: p33.js?v=rel1, rel.js?v=rel1. seller.html: p33.js?v=rel1, rel.js?v=rel1.

## Live gaps
State is localStorage only. Live needs: order columns/table for item stock, pref, key items, stage (picking), promised_at, proof, cases, refunds;
a server-side timer (cron) for the accept deadline / auto-decline / auto-pause / late notice; Twilio events in order-alert; real refunds.

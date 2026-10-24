#!/usr/bin/env python3
"""Nearbuy (a NuvonHub product): convert a Bluepark ORDERS CSV export into SQL for the wholesale_orders table.

Inserting the rows fires the apply_wholesale_order trigger, which adds/updates shop_listings for the shop
whose trade email matches (stock += qty; new listings get retail = trade x 1.5).

Usage:
  python3 import-orders.py orders.csv > orders.sql            # then paste/run orders.sql in Supabase SQL editor
  python3 import-orders.py orders.csv --list-columns          # show the CSV headers and the columns that were guessed
  python3 import-orders.py orders.csv --email "Customer email" --sku "Product code" --qty "Qty" \
          --shipped "Dispatch date" --ref "Order number" --status "Order status" --shipped-status "dispatched,shipped,complete"
  python3 import-orders.py orders.csv --since 2026-10-01      # only orders shipped on/after a date

Formats handled:
  * one row per order line (an email + sku + qty on each row), the usual Bluepark "order items" export; or
  * one row per order with an items column such as "SKU123 x 2; SKU456 x 1" (use --items "Products").
Enriches name / image / trade price from products.json (same folder) so listings display without a products table.
Re-running is safe: ON CONFLICT (order_ref, sku) DO NOTHING stops stock being added twice.
"""
import argparse, csv, json, os, re, sys
from datetime import datetime

GUESS = {
  'email':   ['customer email','email','billing email','email address','customer e-mail','account email'],
  'sku':     ['sku','product sku','item sku','product code','code','part number'],
  'qty':     ['quantity','qty','quantity ordered','item quantity','units'],
  'shipped': ['dispatched date','dispatch date','date dispatched','shipped date','shipped at','date shipped','despatch date','fulfilled date','order date','date'],
  'ref':     ['order number','order id','order no','order reference','order ref','reference','invoice number'],
  'status':  ['order status','status','dispatch status','fulfilment status'],
  'items':   ['products','items','order items','line items'],
}
def find(headers, wanted):
    low = {h.strip().lower(): h for h in headers}
    for w in wanted:
        if w in low: return low[w]
    for w in wanted:
        for k, h in low.items():
            if w in k: return h
    return None
def parse_date(s):
    s = (s or '').strip()
    for f in ('%d/%m/%Y %H:%M:%S','%d/%m/%Y %H:%M','%d/%m/%Y','%Y-%m-%d %H:%M:%S','%Y-%m-%dT%H:%M:%S','%Y-%m-%d','%d-%m-%Y','%d.%m.%Y'):
        try: return datetime.strptime(s[:19], f)
        except ValueError: pass
    return None
q = lambda v: 'null' if v is None or v == '' else "'" + str(v).replace("'", "''") + "'"

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('csv'); ap.add_argument('--list-columns', action='store_true')
    for k in GUESS: ap.add_argument('--' + k, help=f'CSV column for {k} (guessed if omitted)')
    ap.add_argument('--shipped-status', default='dispatched,despatched,shipped,complete,completed,fulfilled',
                    help='comma list of status values counted as shipped (ignored if no status column)')
    ap.add_argument('--since', help='YYYY-MM-DD: skip orders shipped before this date')
    ap.add_argument('--products', default=os.path.join(os.path.dirname(os.path.abspath(__file__)), 'products.json'))
    ap.add_argument('--encoding', default=None, help='CSV encoding (default: try utf-8-sig then cp1252)')
    a = ap.parse_args()

    raw = open(a.csv, 'rb').read()
    for enc in ([a.encoding] if a.encoding else ['utf-8-sig', 'cp1252']):
        try: text = raw.decode(enc); break
        except UnicodeDecodeError: continue
    csv.field_size_limit(10**9)
    rows = list(csv.DictReader(text.splitlines(keepends=True)))
    if not rows: sys.exit('No rows found')
    H = list(rows[0].keys())
    col = {k: (getattr(a, k) or find(H, GUESS[k])) for k in GUESS}
    if a.list_columns:
        print('Headers:', H); print('Using:', json.dumps(col, indent=2)); return
    if not col['email']: sys.exit('Could not find the customer email column. Use --email "<column>". Run --list-columns to see headers.')
    if not (col['sku'] and col['qty']) and not col['items']: sys.exit('Need --sku and --qty columns, or --items for a combined items column.')

    cat = {}
    if os.path.exists(a.products):
        for p in json.load(open(a.products, encoding='utf-8')): cat[p['sku'].strip().upper()] = p
    ok_status = {s.strip().lower() for s in a.shipped_status.split(',') if s.strip()}
    since = datetime.strptime(a.since, '%Y-%m-%d') if a.since else None

    out, skipped, unknown = [], 0, set()
    for i, r in enumerate(rows):
        email = (r.get(col['email']) or '').strip().lower()
        if '@' not in email: skipped += 1; continue
        if col['status'] and ok_status and (r.get(col['status']) or '').strip().lower() not in ok_status: skipped += 1; continue
        when = parse_date(r.get(col['shipped'])) if col['shipped'] else datetime.now()
        if not when or (since and when < since): skipped += 1; continue
        ref = (r.get(col['ref']) or '').strip() if col['ref'] else f'row{i+2}'
        lines = []
        if col['sku'] and col['qty'] and (r.get(col['sku']) or '').strip():
            lines.append(((r.get(col['sku']) or '').strip(), r.get(col['qty'])))
        elif col['items']:
            for part in re.split(r'[;\n|]+', r.get(col['items']) or ''):
                m = re.match(r'\s*([A-Za-z0-9._/-]+)\s*(?:x|×|\*|:)?\s*(\d+)?', part)
                if m and m.group(1): lines.append((m.group(1), m.group(2) or '1'))
        for sku, qty in lines:
            try: qty = int(float(str(qty).strip() or 0))
            except ValueError: qty = 0
            if qty <= 0: continue
            p = cat.get(sku.upper())
            if not p: unknown.add(sku)
            out.append("(%s,%s,%s,%d,%s,%s,%s,%s,%s)" % (q(ref), q(email), q(p['sku'] if p else sku), qty, q(when.strftime('%Y-%m-%d %H:%M:%S')),
                       q(p['name'] if p else None), q(p['images'][0] if p and p['images'] else None), q(p['category'] if p else None),
                       q(p['trade_price'] if p else None)))
    print('-- Nearbuy wholesale_orders import from %s: %d lines, %d rows skipped, %d SKUs not in products.json' % (os.path.basename(a.csv), len(out), skipped, len(unknown)))
    print('-- columns used: ' + json.dumps(col))
    for k in range(0, len(out), 500):
        print('insert into wholesale_orders(order_ref,trade_email,sku,qty,shipped_at,name,image,category,trade_price) values\n' + ',\n'.join(out[k:k+500]) + '\non conflict (order_ref, sku) do nothing;')
    if unknown: print('-- unknown SKUs: ' + ', '.join(sorted(unknown)[:50]), file=sys.stderr)
    print(f'{len(out)} order lines -> SQL ({skipped} skipped)', file=sys.stderr)

if __name__ == '__main__': main()

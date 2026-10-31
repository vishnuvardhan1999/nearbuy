// ShopNip order emails (Supabase Edge Function, Deno). Sends through Resend.
// From: ShopNip <orders@shopnip.co.uk>, Reply-To: hello@shopnip.co.uk
// Events: placed (customer confirmation + shop alert), accepted, ready, out_for_delivery, completed, cancelled, rejected.
// The browser calls this fire-and-forget after place_order / update_order_status. The caller must be signed in and be the
// order's customer or the shop owner, and the event must match the order's current status, so it can't be used to spam.
// Secrets: RESEND_API_KEY (required). SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY are provided by Supabase.
// Optional: EMAIL_FROM, EMAIL_REPLY_TO, SITE_URL.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const FROM = Deno.env.get("EMAIL_FROM") ?? "ShopNip <orders@shopnip.co.uk>";
const REPLY_TO = Deno.env.get("EMAIL_REPLY_TO") ?? "hello@shopnip.co.uk";
const SITE = Deno.env.get("SITE_URL") ?? "https://www.shopnip.co.uk";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const gbp = (n: unknown) => "£" + (Number(n) || 0).toFixed(2);

const STATUS: Record<string, { subject: string; head: string; body: (o: any) => string }> = {
  accepted: { subject: "accepted", head: "Your order has been accepted", body: (o) => o.fulfilment === "delivery" ? "The shop is getting your order ready for delivery." : "The shop is getting your order ready. We’ll email you when it’s ready to collect." },
  ready: { subject: "ready to collect", head: "Your order is ready to collect", body: () => "Bring your collection PIN and show it at the counter. You pay the shop when you collect." },
  out_for_delivery: { subject: "out for delivery", head: "Your order is out for delivery", body: () => "The shop is on its way. You pay the shop on delivery." },
  completed: { subject: "complete", head: "Your order is complete", body: (o) => o.fulfilment === "delivery" ? "Your order has been delivered. Thanks for shopping local." : "Your order has been collected. Thanks for shopping local." },
  cancelled: { subject: "cancelled", head: "Your order has been cancelled", body: (o) => "Your order was cancelled" + (o.reject_reason ? `: ${esc(o.reject_reason)}` : ".") + " You have not been charged." },
  rejected: { subject: "declined", head: "The shop couldn’t take your order", body: (o) => "Sorry, the shop declined this order" + (o.reject_reason ? `: ${esc(o.reject_reason)}` : ".") + " You have not been charged." },
};

function layout(title: string, inner: string) {
  return `<!doctype html><html><body style="margin:0;background:#f4f6f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#14202e">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f5;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden">
<tr><td style="background:#0f3d3a;padding:18px 24px"><span style="color:#fff;font-size:22px;font-weight:800;letter-spacing:-.3px">Shop<span style="color:#ff6b4a">Nip</span></span></td></tr>
<tr><td style="padding:24px"><h1 style="margin:0 0 12px;font-size:21px;line-height:1.3">${esc(title)}</h1>${inner}</td></tr>
<tr><td style="padding:16px 24px;background:#f8faf9;color:#667085;font-size:12px;line-height:1.5">Questions? Reply to this email or write to <a href="mailto:${REPLY_TO}" style="color:#0f766e">${REPLY_TO}</a>.<br>
ShopNip is a trading name of Suman Bros (Wholesale) Limited, company no. 01802958, Crown House, Otterspool Way, Watford WD25 8HL.</td></tr>
</table></td></tr></table></body></html>`;
}
function itemsTable(o: any) {
  const rows = (o.order_items ?? []).map((i: any) => `<tr><td style="padding:6px 0">${esc(i.qty)} × ${esc(i.name)}</td><td align="right" style="padding:6px 0">${gbp(i.unit_price * i.qty)}</td></tr>`).join("");
  const fee = Number(o.delivery_fee) || 0;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e6e9ee;border-bottom:1px solid #e6e9ee;margin:14px 0;font-size:14px">${rows}
${fee ? `<tr><td style="padding:6px 0;color:#667085">Delivery</td><td align="right">${gbp(fee)}</td></tr>` : ""}
<tr><td style="padding:8px 0;font-weight:700">Total</td><td align="right" style="font-weight:700">${gbp(o.total)}</td></tr></table>`;
}
const btn = (href: string, label: string) => `<p style="margin:18px 0 0"><a href="${href}" style="display:inline-block;background:#ff6b4a;color:#fff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:12px">${esc(label)}</a></p>`;
const how = (o: any) => o.fulfilment === "delivery" ? `Local delivery to ${esc(o.delivery_address)}${o.delivery_postcode ? ", " + esc(o.delivery_postcode) : ""}` : "Click &amp; collect";

function customerPlaced(o: any) {
  const pin = o.fulfilment === "collect" && o.collection_pin ? `<p style="background:#f0faf8;border-radius:12px;padding:12px 14px;margin:12px 0">Collection PIN: <b style="font-size:18px;letter-spacing:2px">${esc(o.collection_pin)}</b><br><span style="color:#667085;font-size:13px">Show this at the shop when you collect.</span></p>` : "";
  return layout(`Thanks, your order ${o.order_number ?? ""} is in`, `<p style="margin:0 0 8px">We’ve sent it to <b>${esc(o.shops?.name)}</b>. They’ll accept it shortly and we’ll email you when it moves on.</p>
<p style="margin:0;color:#475467;font-size:14px">${how(o)} · Pay the shop ${o.fulfilment === "delivery" ? "on delivery" : "when you collect"}</p>${pin}${itemsTable(o)}
${o.shops?.address ? `<p style="margin:0;color:#475467;font-size:14px">${esc(o.shops.name)}, ${esc(o.shops.address)}${o.shops.phone ? " · " + esc(o.shops.phone) : ""}</p>` : ""}${btn(SITE + "/orders", "View your order")}`);
}
function shopPlaced(o: any) {
  return layout(`New order ${o.order_number ?? ""}`, `<p style="margin:0 0 8px">You have a new order from <b>${esc(o.customer_name)}</b>${o.customer_phone ? " (" + esc(o.customer_phone) + ")" : ""}.</p>
<p style="margin:0;color:#475467;font-size:14px">${how(o)}</p>${o.note ? `<p style="margin:10px 0 0;font-size:14px"><b>Note:</b> ${esc(o.note)}</p>` : ""}${itemsTable(o)}
<p style="margin:0;font-size:14px">Please accept or decline it in your seller dashboard.</p>${btn(SITE + "/seller.html#orders", "Open orders")}`);
}
function customerStatus(o: any, ev: string) {
  const s = STATUS[ev];
  return layout(s.head, `<p style="margin:0 0 8px">Order <b>${esc(o.order_number)}</b> from <b>${esc(o.shops?.name)}</b>.</p><p style="margin:0">${s.body(o)}</p>${itemsTable(o)}${btn(SITE + "/orders", "View your order")}`);
}

async function send(to: string, subject: string, html: string) {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) throw new Error("RESEND_API_KEY is not set");
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [to], reply_to: REPLY_TO, subject, html }),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${await r.text()}`);
  return (await r.json()).id as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  try {
    const { order_id, event } = await req.json();
    if (!order_id || !(event === "placed" || STATUS[event])) return json({ error: "bad request" }, 400);
    const url = Deno.env.get("SUPABASE_URL")!;
    const user = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
    const { data: u } = await user.auth.getUser();
    if (!u?.user) return json({ error: "sign in" }, 401);
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: o, error } = await admin.from("orders").select("*,shops(name,phone,address,owner_id),order_items(name,qty,unit_price)").eq("id", order_id).maybeSingle();
    if (error || !o) return json({ error: "order not found" }, 404);
    const isCustomer = o.customer_id === u.user.id, isOwner = o.shops?.owner_id === u.user.id;
    if (!isCustomer && !isOwner) return json({ error: "forbidden" }, 403);
    const want = event === "placed" ? "placed" : event;
    if (o.status !== want) return json({ skipped: "status mismatch" });
    // de-duplicate (table from migrations/012_order_email_log.sql; if it is missing we still send)
    const log = await admin.from("order_email_log").insert({ order_id, event });
    if (log.error && log.error.code === "23505") return json({ skipped: "already sent" });

    const sent: string[] = [];
    if (event === "placed") {
      if (o.customer_email) sent.push(await send(o.customer_email, `Order ${o.order_number} confirmed · ${o.shops?.name ?? "ShopNip"}`, customerPlaced(o)));
      const { data: owner } = await admin.auth.admin.getUserById(o.shops?.owner_id);
      const shopTo = owner?.user?.email;
      if (shopTo) sent.push(await send(shopTo, `New order ${o.order_number} · ${o.customer_name ?? ""}`.trim(), shopPlaced(o)));
    } else if (o.customer_email) {
      sent.push(await send(o.customer_email, `Order ${o.order_number} ${STATUS[event].subject} · ${o.shops?.name ?? "ShopNip"}`, customerStatus(o, event)));
    }
    return json({ ok: true, sent });
  } catch (e) {
    console.error(e);
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});

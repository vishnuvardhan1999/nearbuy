// ShopNip new-order alerts (Supabase Edge Function, Deno). Sends SMS, WhatsApp and/or a phone call through Twilio.
// The browser calls this fire-and-forget after place_order. The caller must be signed in and be the order's
// customer or the shop owner.
// Events used by checkout and reliability (rel.js / p33.js): placed, reminder, call, customer_*.
// Secrets: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN (required to send). Optional: TWILIO_SMS_FROM, TWILIO_WHATSAPP_FROM,
// TWILIO_CALLER_ID, SITE_URL. A channel whose From number is missing is skipped.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SITE = Deno.env.get("SITE_URL") ?? "https://www.shopnip.co.uk";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

function digits(p: unknown) {
  return String(p ?? "").replace(/\D/g, "");
}
function toE164(p: unknown) {
  const d = digits(p);
  if (d.length === 12 && d.startsWith("44")) return "+" + d;
  if (d.length === 11 && d.startsWith("07")) return "+44" + d.slice(1);
  if (d.length === 10 && d.startsWith("7")) return "+44" + d;
  return null;
}
function prefs(shop: any) {
  const a = shop?.delivery_options?.order_alerts || {};
  let mobile = String(a.mobile || "").trim();
  if (!mobile && toE164(shop?.phone)) mobile = String(shop.phone).trim();
  return { sms: a.sms !== false, whatsapp: a.whatsapp !== false, call: !!a.call, mobile };
}
function itemCount(o: any) {
  const items = o?.order_items || [];
  const n = items.reduce((t: number, i: any) => t + (+i.qty || 0), 0);
  return n || items.length || 1;
}
function windowFrom(o: any) {
  if (o?.delivery_window) return String(o.delivery_window);
  const note = String(o?.note || "");
  const m = note.match(/^Delivery window:\s*(.+)$/m);
  return m ? m[1].trim() : "";
}
function fulfilmentLabel(o: any) {
  if (o?.fulfilment === "delivery") {
    const w = windowFrom(o);
    return "delivery" + (w ? " (" + w + ")" : "");
  }
  return "click & collect";
}
function textBody(o: any, reminder = false) {
  const n = itemCount(o);
  const total = (Number(o?.total) || 0).toFixed(2);
  const num = o?.order_number || "a new order";
  const lead = reminder ? "Reminder: ShopNip order" : "New ShopNip order";
  return `${lead} ${num}: ${n} item${n === 1 ? "" : "s"}, £${total}, ${fulfilmentLabel(o)}. Open ShopNip Seller to accept: ${SITE.replace(/\/$/, "")}/seller.html#orders`;
}
function customerBody(o: any, event: string) {
  const num = o?.order_number || "your order";
  const track = `${SITE.replace(/\/$/, "")}/orders`;
  if (event === "customer_accepted") return `Your ShopNip order ${num} has been accepted. The shop has checked your items. Track it: ${track}`;
  const kind = event.slice("customer_".length).replace(/_/g, " ") || "updated";
  return `ShopNip update on order ${num}: ${kind}. Track it: ${track}`;
}
function sayMoney(n: unknown) {
  const v = Math.round((Number(n) || 0) * 100);
  const pounds = Math.floor(v / 100);
  const pence = v % 100;
  if (!pounds && !pence) return "zero pounds";
  if (!pence) return `${pounds} pound${pounds === 1 ? "" : "s"}`;
  if (!pounds) return `${pence} pence`;
  return `${pounds} pound${pounds === 1 ? "" : "s"} and ${pence} pence`;
}
function speakBody(o: any, reminder = false) {
  const n = itemCount(o);
  const how = o?.fulfilment === "delivery" ? "delivery" : "click and collect";
  const lead = reminder ? "Hello. This is a reminder. You still have a ShopNip order waiting." : "Hello. You have a new ShopNip order.";
  return `${lead} ${n} item${n === 1 ? "" : "s"}, totalling ${sayMoney(o?.total)}. This is for ${how}. Open ShopNip Seller on your phone to accept the order.`;
}
function escXml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]!));
}

async function twilio(path: string, params: Record<string, string>) {
  const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const token = Deno.env.get("TWILIO_AUTH_TOKEN");
  if (!sid || !token) throw new Error("not_configured");
  const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/${path}`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(`${sid}:${token}`),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(params),
  });
  if (!r.ok) throw new Error(`Twilio ${r.status}: ${await r.text()}`);
  return r.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  try {
    const { order_id, event } = await req.json();
    const customerEvent = typeof event === "string" && event.startsWith("customer_");
    const shopEvent = event === "placed" || event === "reminder" || event === "call";
    if (!order_id || (!shopEvent && !customerEvent)) return json({ error: "bad request" }, 400);
    const url = Deno.env.get("SUPABASE_URL")!;
    const user = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
    const { data: u } = await user.auth.getUser();
    if (!u?.user) return json({ error: "sign in" }, 401);
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: o, error } = await admin.from("orders").select("*,shops(name,phone,address,owner_id,delivery_options),order_items(name,qty,unit_price)").eq("id", order_id).maybeSingle();
    if (error || !o) return json({ error: "order not found" }, 404);
    const isCustomer = o.customer_id === u.user.id, isOwner = o.shops?.owner_id === u.user.id;
    if (!isCustomer && !isOwner) return json({ error: "forbidden" }, 403);
    if (event === "placed" && o.status !== "placed") return json({ skipped: "status mismatch" });
    if ((event === "reminder" || event === "call") && o.status !== "placed") return json({ skipped: "status mismatch" });
    if (!Deno.env.get("TWILIO_ACCOUNT_SID") || !Deno.env.get("TWILIO_AUTH_TOKEN")) return json({ ok: false, reason: "not_configured" });

    const sent: string[] = [];
    const errors: string[] = [];
    const smsFrom = Deno.env.get("TWILIO_SMS_FROM");
    const waFrom = Deno.env.get("TWILIO_WHATSAPP_FROM");
    const caller = Deno.env.get("TWILIO_CALLER_ID");

    if (customerEvent) {
      const to = toE164(o.customer_phone);
      if (!to) return json({ ok: true, skipped: "no customer mobile" });
      const body = customerBody(o, event);
      if (!smsFrom) errors.push("sms: missing TWILIO_SMS_FROM");
      else {
        try { await twilio("Messages.json", { From: smsFrom, To: to, Body: body }); sent.push("sms"); }
        catch (e) { errors.push("sms: " + String((e as Error).message ?? e)); }
      }
      return json({ ok: sent.length > 0, sent, errors: errors.length ? errors : undefined });
    }

    const p = prefs(o.shops);
    const to = toE164(p.mobile);
    const wantSms = event === "call" ? false : p.sms;
    const wantWa = event === "call" ? false : p.whatsapp;
    const wantCall = event === "call" ? true : event === "placed" && p.call;
    if (!to || (!wantSms && !wantWa && !wantCall)) return json({ ok: true, skipped: "no alerts" });

    const body = textBody(o, event === "reminder");
    if (wantSms) {
      if (!smsFrom) errors.push("sms: missing TWILIO_SMS_FROM");
      else {
        try { await twilio("Messages.json", { From: smsFrom, To: to, Body: body }); sent.push("sms"); }
        catch (e) { errors.push("sms: " + String((e as Error).message ?? e)); }
      }
    }
    if (wantWa) {
      if (!waFrom) errors.push("whatsapp: missing TWILIO_WHATSAPP_FROM");
      else {
        const from = waFrom.startsWith("whatsapp:") ? waFrom : `whatsapp:${waFrom}`;
        try { await twilio("Messages.json", { From: from, To: `whatsapp:${to}`, Body: body }); sent.push("whatsapp"); }
        catch (e) { errors.push("whatsapp: " + String((e as Error).message ?? e)); }
      }
    }
    if (wantCall) {
      if (!caller) errors.push("call: missing TWILIO_CALLER_ID");
      else {
        try {
          await twilio("Calls.json", { From: caller, To: to, Twiml: `<Response><Say voice="Polly.Amy" language="en-GB">${escXml(speakBody(o, event === "reminder"))}</Say></Response>` });
          sent.push("call");
        } catch (e) { errors.push("call: " + String((e as Error).message ?? e)); }
      }
    }
    return json({ ok: sent.length > 0, sent, errors: errors.length ? errors : undefined });
  } catch (e) {
    console.error(e);
    const msg = String((e as Error).message ?? e);
    if (msg === "not_configured") return json({ ok: false, reason: "not_configured" });
    return json({ error: msg }, 500);
  }
});

// PaymentIntent for an existing order. Amount, fee and destination are read from the database, never from the client.
// Manual capture: the card is only charged when the shop accepts. Test mode only.
import { CORS, json, admin, requireUser } from "../_shared/http.ts";
import { stripe, pence, feePence, sellingPct } from "../_shared/stripe.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  try {
    const user = await requireUser(req);
    if (!user) return json({ error: "Please sign in" }, 401);
    const { order_id } = await req.json();
    if (!order_id) return json({ error: "Missing order" }, 400);
    const db = admin();
    const { data: order, error } = await db.from("orders").select("id,customer_id,shop_id,fulfilment,subtotal,total,wallet_applied,payment_method,payment_status,stripe_payment_intent_id,status").eq("id", order_id).maybeSingle();
    if (error || !order) return json({ error: "Order not found" }, 404);
    if (order.customer_id !== user.id) return json({ error: "This is not your order" }, 403);
    if (order.payment_method !== "card") return json({ error: "This order is pay at the shop" }, 400);
    if (["rejected", "cancelled"].includes(order.status)) return json({ error: "This order is no longer open" }, 400);
    const { data: shop } = await db.from("shops").select("id,name,stripe_account_id,stripe_charges_enabled,bluepark_customer_email").eq("id", order.shop_id).maybeSingle();
    if (!shop?.stripe_account_id) return json({ error: "This shop is not taking cards yet" }, 400);
    const acct = await stripe("/accounts/" + shop.stripe_account_id, undefined, "GET");
    if (!acct.charges_enabled) return json({ error: "This shop is not taking cards yet" }, 400);
    if (!shop.stripe_charges_enabled) await db.from("shops").update({ stripe_charges_enabled: true }).eq("id", shop.id);

    const due = Math.max(0, Number(order.total) - Number(order.wallet_applied || 0));
    const amount = pence(due);
    if (amount < 30) return json({ error: "Nothing to charge on the card" }, 400);

    if (order.stripe_payment_intent_id) {
      const existing = await stripe("/payment_intents/" + order.stripe_payment_intent_id, undefined, "GET");
      if (["requires_payment_method", "requires_confirmation", "requires_action", "requires_capture"].includes(existing.status)) {
        return json({ client_secret: existing.client_secret, payment_intent: existing.id });
      }
    }

    const pct = await sellingPct(db, shop);
    const fee = feePence(Number(order.subtotal) || 0, order.fulfilment, pct, amount);
    const body: Record<string, string> = {
      amount: String(amount),
      currency: "gbp",
      capture_method: "manual",
      "automatic_payment_methods[enabled]": "true",
      "transfer_data[destination]": shop.stripe_account_id,
      "metadata[order_id]": order.id,
      description: "ShopNip order",
    };
    if (fee > 0) body.application_fee_amount = String(fee);
    const pi = await stripe("/payment_intents", body);
    const saved = await db.from("orders").update({ stripe_payment_intent_id: pi.id, payment_status: "unpaid" }).eq("id", order.id);
    if (saved.error) return json({ error: saved.error.message }, 400);
    return json({ client_secret: pi.client_secret, payment_intent: pi.id });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Could not start the card payment" }, 400);
  }
});

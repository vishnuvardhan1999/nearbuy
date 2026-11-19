// Refunds a captured card payment, never more than amount_paid - amount_refunded. Test mode only.
import { CORS, json, admin, requireUser } from "../_shared/http.ts";
import { pence, stripe } from "../_shared/stripe.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  try {
    const user = await requireUser(req);
    if (!user) return json({ error: "Please sign in" }, 401);
    const body = await req.json();
    const order_id = body.order_id;
    if (!order_id) return json({ error: "Missing order" }, 400);
    const db = admin();
    const { data: order, error } = await db.from("orders").select("id,shop_id,payment_method,stripe_payment_intent_id,amount_paid,amount_refunded,payment_status").eq("id", order_id).maybeSingle();
    if (error || !order) return json({ error: "Order not found" }, 404);
    const { data: shop } = await db.from("shops").select("owner_id").eq("id", order.shop_id).maybeSingle();
    const { data: adm } = user.email ? await db.from("admins").select("email").ilike("email", user.email).maybeSingle() : { data: null };
    if (shop?.owner_id !== user.id && !adm) return json({ error: "Only the shop can refund this card" }, 403);
    if (order.payment_method !== "card" || !order.stripe_payment_intent_id) return json({ error: "This order was not paid by card" }, 400);
    const left = Math.round((Number(order.amount_paid) - Number(order.amount_refunded)) * 100) / 100;
    if (left <= 0) return json({ error: "Nothing left to refund on the card" }, 400);
    let want = body.amount == null ? left : Math.round(Number(body.amount) * 100) / 100;
    if (!(want > 0)) return json({ error: "Enter a refund amount" }, 400);
    if (want > left + 0.001) return json({ error: "That is more than the customer paid on the card" }, 400);
    want = Math.min(want, left);
    const refund = await stripe("/refunds", {
      payment_intent: order.stripe_payment_intent_id,
      amount: String(pence(want)),
      refund_application_fee: "true",
      reverse_transfer: "true",
    });
    const refunded = Math.round((Number(order.amount_refunded) + want) * 100) / 100;
    const status = refunded + 0.001 >= Number(order.amount_paid) ? "refunded" : "partially_refunded";
    const saved = await db.from("orders").update({ amount_refunded: refunded, payment_status: status }).eq("id", order.id);
    if (saved.error) return json({ error: saved.error.message }, 400);
    return json({ refunded: want, amount_refunded: refunded, payment_status: status, stripe_refund: refund.id });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Could not refund the card" }, 400);
  }
});

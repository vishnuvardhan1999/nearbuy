// After the stock check, capture only the final total (never more than was authorised).
// Decline, cancel and timeout cancel the PaymentIntent instead. Test mode only.
import { CORS, json, admin, requireUser } from "../_shared/http.ts";
import { stripe, pence } from "../_shared/stripe.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  try {
    const user = await requireUser(req);
    if (!user) return json({ error: "Please sign in" }, 401);
    const { order_id, action } = await req.json();
    if (!order_id || !["capture", "cancel"].includes(action)) return json({ error: "Bad request" }, 400);
    const db = admin();
    const { data: order, error } = await db.from("orders").select("id,customer_id,shop_id,fulfilment,subtotal,total,wallet_applied,payment_method,stripe_payment_intent_id,status,awaiting_customer").eq("id", order_id).maybeSingle();
    if (error || !order) return json({ error: "Order not found" }, 404);
    const { data: shop } = await db.from("shops").select("id,owner_id,bluepark_customer_email").eq("id", order.shop_id).maybeSingle();
    const owner = shop?.owner_id === user.id;
    const customer = order.customer_id === user.id;
    const { data: adm } = user.email ? await db.from("admins").select("email").ilike("email", user.email).maybeSingle() : { data: null };
    const isAdmin = !!adm;
    if (action === "capture" && !owner && !isAdmin) return json({ error: "Only the shop can take the payment" }, 403);
    if (action === "cancel" && !owner && !customer && !isAdmin) return json({ error: "Forbidden" }, 403);
    if (order.payment_method !== "card" || !order.stripe_payment_intent_id) return json({ skipped: true });

    const pi = await stripe("/payment_intents/" + order.stripe_payment_intent_id, undefined, "GET");
    if (action === "cancel" || ["rejected", "cancelled"].includes(order.status)) {
      if (["requires_payment_method", "requires_confirmation", "requires_action", "requires_capture"].includes(pi.status)) {
        await stripe("/payment_intents/" + pi.id + "/cancel", {});
      }
      if (pi.status !== "succeeded") {
        await db.from("orders").update({ payment_status: "unpaid" }).eq("id", order.id);
      }
      return json({ cancelled: true });
    }

    if (order.awaiting_customer) return json({ skipped: true, reason: "waiting for the customer" });
    if (pi.status === "succeeded") return json({ already: "paid" });
    if (pi.status !== "requires_capture") return json({ skipped: true, status: pi.status });

    const due = Math.max(0, Number(order.total) - Number(order.wallet_applied || 0));
    const want = Math.min(pence(due), Number(pi.amount_capturable || pi.amount || 0));
    if (want < 30) {
      await stripe("/payment_intents/" + pi.id + "/cancel", {});
      await db.from("orders").update({ payment_status: "unpaid" }).eq("id", order.id);
      return json({ cancelled: true, reason: "nothing left to charge" });
    }
    const body: Record<string, string> = { amount_to_capture: String(want) };
    const captured = await stripe("/payment_intents/" + pi.id + "/capture", body);
    const paid = (Number(captured.amount_received) || want) / 100;
    await db.from("orders").update({ payment_status: "paid", amount_paid: paid }).eq("id", order.id);
    return json({ paid, amount_paid: paid });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Could not update the card payment" }, 400);
  }
});

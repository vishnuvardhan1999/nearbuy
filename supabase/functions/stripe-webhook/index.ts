// Stripe webhook. Accept either signing secret, then update the shop or the order.
// Events: account.updated, payment_intent.succeeded, payment_intent.amount_capturable_updated,
// payment_intent.payment_failed, charge.refunded. Include connected-account events in Stripe.
// Shop subscription (platform account): customer.subscription.created/updated/deleted keep shops.sub_* in step.
import { admin } from "../_shared/http.ts";
import { verifyStripe } from "../_shared/stripe.ts";

async function mark(db: ReturnType<typeof admin>, obj: any, status: string, extra: Record<string, unknown>) {
  const oid = obj.metadata?.order_id;
  const q = db.from("orders").select("id,payment_status,amount_paid");
  const { data: order } = await (oid ? q.eq("id", oid) : q.eq("stripe_payment_intent_id", obj.id)).maybeSingle();
  if (!order) return;
  if (["paid", "refunded", "partially_refunded"].includes(order.payment_status) && status === "authorised") return;
  if (["refunded", "partially_refunded"].includes(order.payment_status) && status === "paid") return;
  await db.from("orders").update({ payment_status: status, stripe_payment_intent_id: obj.id, ...extra }).eq("id", order.id);
}

const SUB_STATUS: Record<string, string> = {
  trialing: "trialing", active: "active", past_due: "past_due", canceled: "cancelled", unpaid: "unpaid",
  incomplete: "incomplete", incomplete_expired: "cancelled", paused: "past_due",
};

async function syncSubscription(db: ReturnType<typeof admin>, sub: any) {
  const shopId = sub.metadata?.shop_id;
  const patch: Record<string, unknown> = {
    sub_status: SUB_STATUS[sub.status] || "none",
    stripe_subscription_id: sub.id,
    sub_trial_ends_at: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
    sub_current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
  };
  if (!patch.sub_trial_ends_at) delete patch.sub_trial_ends_at;   // keep the record that the free month was used
  const q = db.from("shops").update(patch);
  if (shopId) await q.eq("id", shopId);
  else if (sub.customer) await q.eq("stripe_customer_id", sub.customer);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("POST only", { status: 405 });
  const raw = await req.text();
  try {
    await verifyStripe(raw, req.headers.get("stripe-signature"));
  } catch (e) {
    return new Response(e instanceof Error ? e.message : "Bad signature", { status: 400 });
  }
  const event = JSON.parse(raw);
  const obj = event.data?.object || {};
  const db = admin();
  try {
    if (event.type?.startsWith("customer.subscription.") && obj.id) {
      await syncSubscription(db, obj);
    } else if (event.type === "account.updated" && obj.id) {
      await db.from("shops").update({ stripe_charges_enabled: !!obj.charges_enabled }).eq("stripe_account_id", obj.id);
    } else if (event.type === "payment_intent.amount_capturable_updated" && obj.id) {
      await mark(db, obj, "authorised", {});
    } else if (event.type === "payment_intent.succeeded" && obj.id) {
      await mark(db, obj, "paid", { amount_paid: (Number(obj.amount_received) || 0) / 100 });
    } else if (event.type === "payment_intent.payment_failed" && obj.id) {
      await mark(db, obj, "failed", {});
    } else if (event.type === "charge.refunded" && obj.payment_intent) {
      const { data: order } = await db.from("orders").select("id,amount_paid").eq("stripe_payment_intent_id", obj.payment_intent).maybeSingle();
      if (order) {
        const refunded = Math.min(Number(order.amount_paid) || 0, (Number(obj.amount_refunded) || 0) / 100);
        const status = refunded + 0.001 >= Number(order.amount_paid) && Number(order.amount_paid) > 0 ? "refunded" : "partially_refunded";
        await db.from("orders").update({ amount_refunded: refunded, payment_status: status }).eq("id", order.id);
      }
    }
  } catch (e) {
    return new Response(e instanceof Error ? e.message : "Could not apply the event", { status: 500 });
  }
  return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
});

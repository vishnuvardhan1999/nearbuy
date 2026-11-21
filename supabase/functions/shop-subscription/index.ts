// ShopNip · shop subscription (£10 a month, first month free, no commission on orders).
// Switched OFF until SHOP_SUBSCRIPTIONS_ENABLED = "true". Until then every call returns { enabled: false }.
// POST {}                → Stripe Checkout (mode=subscription) URL for the caller's shop.
// POST { portal: true }  → Stripe Billing Portal URL to update the card or cancel.
// POST { status: true }  → current subscription status only.
// Secrets: STRIPE_SECRET_KEY, STRIPE_SUBSCRIPTION_PRICE_ID (the £10/month price), SHOP_SUBSCRIPTIONS_ENABLED.
// Optional: SUBSCRIPTION_TRIAL_DAYS (default 30), SITE_URL. Deploy with verify_jwt = true.
import { CORS, json, admin, requireUser } from "../_shared/http.ts";
import { stripe } from "../_shared/stripe.ts";

const site = () => (Deno.env.get("SITE_URL") || "https://www.shopnip.co.uk").replace(/\/$/, "");
const enabled = () => (Deno.env.get("SHOP_SUBSCRIPTIONS_ENABLED") || "").toLowerCase() === "true";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  try {
    const user = await requireUser(req);
    if (!user) return json({ error: "Please sign in" }, 401);
    const body = await req.json().catch(() => ({}));
    const db = admin();
    const { data: shop, error } = await db.from("shops")
      .select("id,name,owner_id,status,sub_status,sub_trial_ends_at,sub_current_period_end,stripe_customer_id,stripe_subscription_id")
      .eq("owner_id", user.id).maybeSingle();
    if (error) return json({ error: error.message }, 400);
    if (!shop) return json({ error: "Register your shop first" }, 404);
    const status = { enabled: enabled(), sub_status: shop.sub_status, sub_trial_ends_at: shop.sub_trial_ends_at, sub_current_period_end: shop.sub_current_period_end };
    if (body.status || !enabled()) return json(status);

    let customer = shop.stripe_customer_id as string | null;
    if (!customer) {
      const c = await stripe("/customers", { email: user.email || "", name: shop.name || "ShopNip shop", "metadata[shop_id]": shop.id });
      customer = c.id;
      await db.from("shops").update({ stripe_customer_id: customer }).eq("id", shop.id);
    }
    const base = site();
    if (body.portal) {
      const p = await stripe("/billing_portal/sessions", { customer: customer!, return_url: base + "/seller.html#settings" });
      return json({ ...status, url: p.url });
    }
    if (["active", "trialing", "past_due"].includes(shop.sub_status)) {
      return json({ ...status, already: true });
    }
    const price = Deno.env.get("STRIPE_SUBSCRIPTION_PRICE_ID") || "";
    if (!price) return json({ error: "The subscription price is not set up yet" }, 400);
    const trial = Math.max(0, Math.min(60, Number(Deno.env.get("SUBSCRIPTION_TRIAL_DAYS") || 30)));
    const hadTrial = !!shop.sub_trial_ends_at;
    const params: Record<string, string> = {
      mode: "subscription",
      customer: customer!,
      "line_items[0][price]": price,
      "line_items[0][quantity]": "1",
      "subscription_data[metadata][shop_id]": shop.id,
      "metadata[shop_id]": shop.id,
      success_url: base + "/seller.html#settings",
      cancel_url: base + "/seller.html#settings",
      "payment_method_collection": "always",
    };
    if (trial > 0 && !hadTrial) params["subscription_data[trial_period_days]"] = String(trial);
    const s = await stripe("/checkout/sessions", params);
    return json({ ...status, url: s.url });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Could not open billing" }, 400);
  }
});

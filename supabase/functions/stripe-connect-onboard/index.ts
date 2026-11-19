// Creates or reuses a Stripe Express account for the caller's shop and returns an Account Link.
// Test mode only. Secret: STRIPE_SECRET_KEY (already set). Never logged.
import { CORS, json, admin, requireUser } from "../_shared/http.ts";
import { stripe } from "../_shared/stripe.ts";

const site = () => (Deno.env.get("SITE_URL") || "https://www.shopnip.co.uk").replace(/\/$/, "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  try {
    const user = await requireUser(req);
    if (!user) return json({ error: "Please sign in" }, 401);
    const db = admin();
    const { data: shop, error } = await db.from("shops").select("id,name,stripe_account_id,owner_id").eq("owner_id", user.id).maybeSingle();
    if (error) return json({ error: error.message }, 400);
    if (!shop) return json({ error: "Register your shop first" }, 404);
    let account = shop.stripe_account_id as string | null;
    if (!account) {
      const created = await stripe("/accounts", {
        type: "express",
        country: "GB",
        "capabilities[card_payments][requested]": "true",
        "capabilities[transfers][requested]": "true",
        email: user.email || "",
        "business_profile[name]": shop.name || "ShopNip shop",
        "metadata[shop_id]": shop.id,
      });
      account = created.id;
      const saved = await db.from("shops").update({ stripe_account_id: account }).eq("id", shop.id);
      if (saved.error) return json({ error: saved.error.message }, 400);
    }
    const base = site();
    const link = await stripe("/account_links", {
      account,
      type: "account_onboarding",
      refresh_url: base + "/seller.html#overview",
      return_url: base + "/seller.html#overview",
    });
    return json({ url: link.url });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Could not connect Stripe" }, 400);
  }
});

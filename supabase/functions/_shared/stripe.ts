// Stripe REST helper. Test mode only. Never log the secret key.

export function stripeKey() {
  const key = Deno.env.get("STRIPE_SECRET_KEY") || "";
  if (!key.startsWith("sk_test_")) throw new Error("Card payments are in test mode only");
  return key;
}

export async function stripe(path: string, body?: Record<string, string>, method = "POST") {
  const r = await fetch("https://api.stripe.com/v1" + path, {
    method,
    headers: {
      Authorization: "Bearer " + stripeKey(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body && method !== "GET" ? new URLSearchParams(body) : undefined,
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data?.error?.message || "Stripe could not complete that");
  return data;
}

export const pence = (pounds: number) => Math.max(0, Math.round((Number(pounds) || 0) * 100));

/** Selling fee in pence. Click & collect is 0. Delivery is a percent of the goods subtotal, not the delivery charge. */
export function feePence(subtotal: number, fulfilment: string, pct: number, chargePence: number) {
  if (fulfilment !== "delivery" || pct <= 0) return 0;
  const fee = Math.max(0, Math.round((Number(subtotal) || 0) * pct));
  return Math.min(fee, chargePence);
}

export async function sellingPct(admin: { from: (t: string) => any }, shop: { bluepark_customer_email?: string | null }): Promise<number> {
  let tradePct = 5, otherPct = 10;
  try {
    const { data } = await admin.from("marketplace_fee_settings").select("trade_selling_pct,other_selling_pct").eq("id", 1).maybeSingle();
    if (data) {
      if (data.trade_selling_pct != null) tradePct = Number(data.trade_selling_pct);
      if (data.other_selling_pct != null) otherPct = Number(data.other_selling_pct);
    }
  } catch (_) { /* defaults stand */ }
  const email = String(shop.bluepark_customer_email || "").trim();
  if (!email) return otherPct;
  try {
    const { data, error } = await admin.from("wholesale_orders").select("id").ilike("trade_email", email).limit(1);
    if (!error && data && data.length) return tradePct;
  } catch (_) { /* not a trade shop */ }
  return otherPct;
}

export async function verifyStripe(raw: string, header: string | null) {
  // Connected-accounts endpoint, then the platform endpoint. Accept the first match.
  const secrets = ["STRIPE_WEBHOOK_SECRET", "STRIPE_WEBHOOK_SECRET_PLATFORM"]
    .map((name) => Deno.env.get(name) || "")
    .filter((secret) => secret.length > 0);
  if (!secrets.length) throw new Error("Webhook secret is not set");
  if (!header) throw new Error("Missing Stripe signature");
  const bits = header.split(",").map((p) => p.split("="));
  const t = bits.find((p) => p[0] === "t")?.[1];
  const sigs = bits.filter((p) => p[0] === "v1").map((p) => p[1]);
  if (!t || !sigs.length) throw new Error("Bad Stripe signature");
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) throw new Error("Stale Stripe signature");
  const payload = new TextEncoder().encode(t + "." + raw);
  for (const secret of secrets) {
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const mac = await crypto.subtle.sign("HMAC", key, payload);
    const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
    if (sigs.some((s) => s.length === hex.length && timingSafe(s, hex))) return;
  }
  throw new Error("Stripe signature does not match");
}

function timingSafe(a: string, b: string) {
  let n = 0;
  for (let i = 0; i < a.length; i++) n |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return n === 0;
}

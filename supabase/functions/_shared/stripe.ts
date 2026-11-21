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

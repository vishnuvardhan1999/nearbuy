// ShopNip support alert (Supabase Edge Function, Deno). Emails the admin mailbox when a support case comes in.
// The browser calls this fire-and-forget right after inserting into support_cases. The caller must be signed in and be
// the person who raised the case, the case must be new, and each case is emailed once (support_cases.admin_alerted_at).
// Secrets: ADMIN_EMAIL (required, comma-separated for several), RESEND_API_KEY (required).
// Optional: EMAIL_FROM, ADMIN_SITE_URL (link to the admin Support section). SUPABASE_* are provided by Supabase.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const FROM = Deno.env.get("EMAIL_FROM") ?? "ShopNip <orders@shopnip.co.uk>";
const ADMIN_SITE = (Deno.env.get("ADMIN_SITE_URL") ?? "").replace(/\/$/, "");
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const hm = (t: string) => new Date(t).toLocaleString("en-GB", { timeZone: "Europe/London", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

async function send(to: string[], subject: string, html: string, replyTo?: string) {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) throw new Error("RESEND_API_KEY is not set");
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to, subject, html, ...(replyTo ? { reply_to: replyTo } : {}) }),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${await r.text()}`);
  return (await r.json()).id as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  try {
    const to = (Deno.env.get("ADMIN_EMAIL") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    if (!to.length) return json({ error: "ADMIN_EMAIL is not set" }, 500);
    const { case_id } = await req.json();
    if (!case_id) return json({ error: "bad request" }, 400);
    const url = Deno.env.get("SUPABASE_URL")!;
    const user = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
    const { data: u } = await user.auth.getUser();
    if (!u?.user) return json({ error: "sign in" }, 401);
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: c } = await admin.from("support_cases").select("*").eq("id", case_id).maybeSingle();
    if (!c) return json({ error: "case not found" }, 404);
    if (c.user_id !== u.user.id) return json({ error: "forbidden" }, 403);
    if (Date.now() - Date.parse(c.created_at) > 15 * 60e3) return json({ skipped: "too old" });
    // claim the alert so it is only ever sent once
    const { data: claimed } = await admin.from("support_cases").update({ admin_alerted_at: new Date().toISOString() })
      .eq("id", case_id).is("admin_alerted_at", null).select("id");
    if (!claimed?.length) return json({ skipped: "already sent" });

    const [{ data: o }, { data: s }] = await Promise.all([
      c.order_id ? admin.from("orders").select("order_number,total,status,customer_name,customer_email,customer_phone").eq("id", c.order_id).maybeSingle() : Promise.resolve({ data: null }),
      c.shop_id ? admin.from("shops").select("name,phone").eq("id", c.shop_id).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    let photo = "";
    if (c.photo_path) {
      const { data: sig } = await admin.storage.from("support-photos").createSignedUrl(c.photo_path, 60 * 60 * 24);
      if (sig?.signedUrl) photo = sig.signedUrl;
    }
    const who = c.raised_by === "seller" ? `Seller · ${s?.name ?? "shop"}` : `Customer · ${o?.customer_name ?? u.user.email ?? ""}`;
    const subject = `New support case${o?.order_number ? " · " + o.order_number : ""} · ${c.raised_by === "seller" ? s?.name ?? "seller" : "customer"}`;
    const rows = [
      ["Raised by", who],
      ["Email", u.user.email ?? ""],
      o ? ["Order", `${o.order_number} · ${o.status} · £${(Number(o.total) || 0).toFixed(2)}`] : null,
      s ? ["Shop", `${s.name}${s.phone ? " · " + s.phone : ""}`] : null,
      ["Reply by", hm(c.reply_due_at)],
    ].filter(Boolean) as string[][];
    const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#14202e;max-width:560px">
<h2 style="margin:0 0 10px">New support case</h2>
<table cellpadding="0" cellspacing="0" style="font-size:14px;margin-bottom:12px">${rows.map(([k, v]) => `<tr><td style="padding:3px 12px 3px 0;color:#667085">${esc(k)}</td><td style="padding:3px 0"><b>${esc(v)}</b></td></tr>`).join("")}</table>
<p style="background:#f4f6f5;border-radius:10px;padding:12px 14px;white-space:pre-wrap;margin:0 0 12px">${esc(c.message)}</p>
${photo ? `<p style="margin:0 0 12px"><a href="${esc(photo)}">View the photo</a> (link works for 24 hours)</p>` : ""}
${ADMIN_SITE ? `<p><a href="${esc(ADMIN_SITE)}/#support" style="display:inline-block;background:#0f766e;color:#fff;text-decoration:none;font-weight:700;padding:10px 16px;border-radius:10px">Open the support desk</a></p>` : ""}
<p style="color:#667085;font-size:12px">Take ownership in the admin Support section so only one person handles it.</p></div>`;
    try {
      const id = await send(to, subject, html, u.user.email ?? undefined);
      return json({ ok: true, id });
    } catch (e) {
      await admin.from("support_cases").update({ admin_alerted_at: null }).eq("id", case_id);
      throw e;
    }
  } catch (e) {
    console.error(e);
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});

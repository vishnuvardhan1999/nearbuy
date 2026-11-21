// ShopNip · product-from-photo. A shop owner sends a product photo (and/or a barcode) and gets back a suggested
// title, category and age-restriction kind for "Add your own product".
// Order of lookups: barcode → Open Food Facts (free, no key); photo → AI vision model when OPENAI_API_KEY is set.
// Nothing is saved here; the browser saves the listing after the shop checks the title and sets price and stock.
// Secrets (optional): OPENAI_API_KEY, OPENAI_VISION_MODEL (default gpt-4o-mini). Never logged.
// Deploy with verify_jwt = true: only signed-in shop owners may call it.
import { CORS, json, admin, requireUser } from "../_shared/http.ts";

const CATS = [
  "Soft drinks", "Energy drinks", "Water", "Beer & cider", "Wine", "Spirits", "Crisps & snacks", "Confectionery",
  "Biscuits & cakes", "Bakery", "Dairy & eggs", "Chilled", "Frozen", "Tins & jars", "Rice, pasta & noodles",
  "Cooking & baking", "Breakfast", "World foods", "Fruit & veg", "Meat & fish", "Tea & coffee", "Household",
  "Toiletries & health", "Baby", "Pet", "Tobacco & vapes", "Stationery", "Cards & gifts", "Party & balloons", "Other",
];

function kindOf(text: string): string | null {
  const t = " " + text.toLowerCase() + " ";
  if (/(wine gum|non[- ]?alcoholic|alcohol[- ]free|0\.0%|ginger)/.test(t)) {
    // fall through to the other checks
  } else if (/[^a-z](wine|beer|lager|cider|ale|stout|vodka|whisky|whiskey|gin|rum|brandy|tequila|liqueur|prosecco|champagne|spirits?|alcohol)[^a-z]/.test(t)) return "alcohol";
  if (/[^a-z](cigarettes?|cigars?|tobacco|rolling papers?|rizla)[^a-z]/.test(t)) return "tobacco";
  if (/[^a-z](vapes?|e-?liquids?|nicotine|e-?cig)/.test(t)) return "vape";
  if (/[^a-z](energy drinks?|red bull|monster energy|relentless|rockstar energy|prime energy)[^a-z]/.test(t)) return "energy";
  if (/[^a-z](knife|knives|razor blades?|lighter refill|butane)[^a-z]/.test(t)) return "knife";
  return null;
}

function pickCat(raw: string): string {
  const r = raw.toLowerCase();
  const hit = CATS.find((c) => c.toLowerCase() === r) || CATS.find((c) => r.includes(c.toLowerCase().split(" ")[0]));
  return hit || "Other";
}

async function fromBarcode(code: string) {
  const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=product_name,product_name_en,brands,quantity,categories_tags,image_front_url`, {
    headers: { "User-Agent": "ShopNip/1.0 (hello@shopnip.co.uk)" },
  });
  if (!r.ok) return null;
  const j = await r.json();
  if (j.status !== 1 || !j.product) return null;
  const p = j.product;
  const name = String(p.product_name_en || p.product_name || "").trim();
  if (!name) return null;
  const brand = String(p.brands || "").split(",")[0].trim();
  const qty = String(p.quantity || "").trim();
  const title = [brand && !name.toLowerCase().includes(brand.toLowerCase()) ? brand : "", name, qty].filter(Boolean).join(" ").replace(/\s+/g, " ").slice(0, 120);
  const tags = (p.categories_tags || []).join(" ").replace(/en:|-/g, " ");
  return { title, category: pickCat(tags), image: p.image_front_url || null, source: "barcode" };
}

async function fromPhoto(dataUrl: string) {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) return null;
  const model = Deno.env.get("OPENAI_VISION_MODEL") || "gpt-4o-mini";
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 200,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You name retail products for a UK corner shop listing. Reply with JSON only: {\"title\": string, \"category\": string, \"barcode\": string|null}. Title is brand + product + size as printed on the pack, for example \"Coca-Cola Original Taste 500ml\". Use UK English. If you can't tell, title is an empty string. Category must be one of: " + CATS.join(", ") + "." },
        { role: "user", content: [{ type: "text", text: "Name this product." }, { type: "image_url", image_url: { url: dataUrl, detail: "low" } }] },
      ],
    }),
  });
  if (!r.ok) return null;
  const j = await r.json();
  try {
    const out = JSON.parse(j.choices?.[0]?.message?.content || "{}");
    const title = String(out.title || "").replace(/\s+/g, " ").trim().slice(0, 120);
    if (!title) return null;
    const barcode = /^[0-9]{8,14}$/.test(String(out.barcode || "")) ? String(out.barcode) : null;
    return { title, category: pickCat(String(out.category || "")), barcode, source: "photo" };
  } catch (_) {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  try {
    const user = await requireUser(req);
    if (!user) return json({ error: "Please sign in" }, 401);
    const { data: shop } = await admin().from("shops").select("id").eq("owner_id", user.id).maybeSingle();
    if (!shop) return json({ error: "Register your shop first" }, 403);

    const body = await req.json().catch(() => ({}));
    const image = typeof body.image === "string" && /^data:image\/(jpeg|png|webp);base64,/.test(body.image) ? body.image : null;
    if (image && image.length > 1_600_000) return json({ error: "Photo is too large. Try again with a smaller photo." }, 413);
    let barcode = String(body.barcode || "").replace(/\D/g, "");
    if (barcode && (barcode.length < 8 || barcode.length > 14)) barcode = "";

    let out: { title: string; category: string; image?: string | null; source: string; barcode?: string | null } | null = null;
    if (barcode) out = await fromBarcode(barcode).catch(() => null);
    if (!out && image) {
      const seen = await fromPhoto(image).catch(() => null);
      if (seen) {
        out = seen;
        if (!barcode && seen.barcode) {
          barcode = seen.barcode;
          const off = await fromBarcode(barcode).catch(() => null);
          if (off) out = { ...off, source: "photo+barcode" };
        }
      }
    }
    if (!out) {
      return json({ title: "", category: "Other", age_kind: null, barcode: barcode || null, source: "none",
        ai: !!Deno.env.get("OPENAI_API_KEY") });
    }
    return json({ title: out.title, category: out.category, age_kind: kindOf(out.title + " " + out.category),
      barcode: barcode || null, source: out.source, ai: !!Deno.env.get("OPENAI_API_KEY") });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Could not read the photo" }, 400);
  }
});

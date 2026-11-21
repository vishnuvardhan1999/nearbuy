// Supabase public (publishable) config. Safe to expose; access is controlled by RLS.
window.APP_CONFIG = {
  SUPABASE_URL: "https://nvkfatgnlydgznzczehj.supabase.co",
  SUPABASE_KEY: "sb_publishable_jQ-2c28tQuv_nCUyzq94eQ_HlGoPYaQ",
  // Stripe test publishable key. Safe in the browser. The secret key stays in Supabase.
  STRIPE_PUBLISHABLE_KEY: "pk_test_51Q1uii2KfAEOHpjvr6EwuJnKVGZ6ll9iorqgD5oPIiyXV9pKth3HR4NATadcEwvfKyNrr9elFJSTp9cAdV05OOCp007Qyp4nAS",
  // Public contact address shown on the Contact/FAQ/legal pages. Change here.
  CONTACT_EMAIL: "hello@shopnip.co.uk",
  // Card payments stay hidden until the payment account owner is decided. Set true to show Pay by card.
  CARD_PAYMENTS: false,
  // £10/month shop subscription (no commission). Billing stays off until this and the server flag are both on.
  SHOP_SUBSCRIPTION: false,
  SUBSCRIPTION_PRICE: 10,
  // Version of the seller terms a shop accepts. Bump when the seller terms change.
  SELLER_TERMS_VERSION: "2026-11",
  SITE_URL: "https://www.shopnip.co.uk",
};

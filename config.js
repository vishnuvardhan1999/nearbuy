// Supabase public (publishable) config. Safe to expose; access is controlled by RLS.
window.APP_CONFIG = {
  SUPABASE_URL: "https://nvkfatgnlydgznzczehj.supabase.co",
  SUPABASE_KEY: "sb_publishable_jQ-2c28tQuv_nCUyzq94eQ_HlGoPYaQ",
  // Emails that can open the Admin view (approve shops). Must also be added to the admins table (see migration_002_phase2.sql).
  ADMIN_EMAILS: ["vishnuvardhan.kesavarapu@outlook.com"],
};

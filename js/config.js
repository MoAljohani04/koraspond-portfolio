// ============================================================================
//  EDIT THIS FILE — paste your Supabase project keys below.
//  (Supabase Dashboard → Project Settings → API)
//
//  These two values are SAFE to be public:
//   • The URL is just your project address.
//   • The "anon" key is designed to be shipped in the browser. Your data is
//     protected by Row-Level Security in the database, NOT by hiding this key.
//   NEVER put the "service_role" key here — it must never be in the browser.
// ============================================================================

export const SUPABASE_URL = "https://lznghqmpjtutzjuqqhzu.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_ogHe_ytl2Wv0bwdH38rPFA_1v1bwnku";

// True once real keys are filled in above. Until then, the public site shows
// built-in demo content and the admin page shows setup steps.
//
// NOTE: this checks the *shape* of the values rather than comparing them to
// the placeholder text, so a find-and-replace over this file can't
// accidentally break the check.
export function isConfigured() {
  return (
    /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(SUPABASE_URL.trim()) &&
    SUPABASE_ANON_KEY.trim().length > 20
  );
}

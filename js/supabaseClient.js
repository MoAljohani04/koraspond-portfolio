// Shared Supabase browser client + small helpers.
// The library is loaded straight from a CDN as an ES module — no build step.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { SUPABASE_URL, SUPABASE_ANON_KEY, isConfigured } from "./config.js";

export { isConfigured };

let _client = null;

/** Returns the singleton Supabase client, or null if not configured yet. */
export function getClient() {
  if (!isConfigured()) return null;
  if (!_client) {
    _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true, // needed for password-reset links
      },
    });
  }
  return _client;
}

/**
 * Resolves to the current admin context, or null.
 * Admin = a valid Supabase session whose user id exists in admin_users.
 * The admin_users check is enforced by the database via RLS; here we just read
 * it to decide what UI to show.
 */
export async function getAdmin() {
  const supabase = getClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: adminRow } = await supabase
    .from("admin_users")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (!adminRow) return null;
  return { supabase, user };
}

/** The public storage bucket used for all uploads. */
export const BUCKET = "media";

/** Build the public URL for a stored object path. */
export function publicUrl(path) {
  const supabase = getClient();
  if (!supabase) return "";
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

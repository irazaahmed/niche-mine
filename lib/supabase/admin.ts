import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/** Service-role client — bypasses RLS. Server-only: never import this from
 * a Client Component or expose SUPABASE_SERVICE_ROLE_KEY to the browser.
 * Used for admin actions (blocking users, changing limits) and system
 * writes (AI usage counters, activity log) that must not depend on the
 * calling user's own row-level policies. */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

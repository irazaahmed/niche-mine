import { createClient as createAdminClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

/** Thrown when a user is over their daily/monthly AI call cap — callers
 * turn this into the "Daily AI limit reached, resets at [time]" UI message
 * required by CLAUDE.md section 5. */
export class AiLimitExceededError extends Error {
  constructor(public resetDate: string) {
    super(`AI usage limit reached. Resets on ${resetDate}.`);
    this.name = "AiLimitExceededError";
  }
}

function admin() {
  return createAdminClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/** Resets the per-user counter once a day has elapsed since last_reset_date,
 * then throws AiLimitExceededError if the (possibly just-reset) count is at
 * or over the user's limit. Must be called immediately before every OpenAI
 * call — never trust a client-side check. */
export async function assertAiCallAllowed(userId: string): Promise<void> {
  const supabase = admin();
  const { data: user, error } = await supabase
    .from("users")
    .select("ai_calls_count, ai_calls_limit, last_reset_date, status")
    .eq("id", userId)
    .single();

  if (error || !user) throw new Error("User not found.");
  if (user.status === "blocked") throw new Error("This account has been blocked.");

  const today = new Date().toISOString().slice(0, 10);
  let count = user.ai_calls_count;

  if (user.last_reset_date !== today) {
    count = 0;
    await supabase.from("users").update({ ai_calls_count: 0, last_reset_date: today }).eq("id", userId);
  }

  if (count >= user.ai_calls_limit) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    throw new AiLimitExceededError(tomorrow.toISOString().slice(0, 10));
  }
}

/** Call after a successful OpenAI call: increments the usage counter and
 * writes an activity_log row (CLAUDE.md section 5 — every AI call must be
 * logged with token count if available). */
export async function recordAiCall(
  userId: string,
  action: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  const supabase = admin();

  const { data } = await supabase.from("users").select("ai_calls_count").eq("id", userId).single();
  await supabase
    .from("users")
    .update({ ai_calls_count: (data?.ai_calls_count ?? 0) + 1 })
    .eq("id", userId);

  await supabase.from("activity_log").insert({
    user_id: userId,
    action,
    metadata,
  });
}

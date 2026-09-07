import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { UserRow } from "@/lib/supabase/types";

/** Server Component / Server Action helper: the signed-in auth user plus
 * their public.users profile row (role, plan, usage counters). Redirects
 * to /login if there's no session — middleware already guards dashboard
 * routes, but Server Components render before a redirect from a sibling
 * layout would apply, so each data-fetching entry point checks again. */
export async function requireUser(): Promise<{ id: string; email: string; profile: UserRow }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single();
  if (!profile) redirect("/login");

  return { id: user.id, email: user.email ?? "", profile };
}

/** Same as requireUser, but also redirects non-admins away. */
export async function requireAdmin(): Promise<{ id: string; email: string; profile: UserRow }> {
  const current = await requireUser();
  if (current.profile.role !== "admin") redirect("/dashboard");
  return current;
}

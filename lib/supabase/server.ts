import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "./types";

/** Server Component / Server Action / Route Handler client — reads and
 * (where the runtime allows) writes the session cookie. Server Components
 * can't set cookies, so `setAll` failures there are swallowed; middleware
 * is what actually refreshes the session cookie on every request. */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — middleware refreshes the
            // session cookie instead, so this is safe to ignore.
          }
        },
      },
    }
  );
}

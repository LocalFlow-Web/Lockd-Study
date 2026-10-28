import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_KEY, SUPABASE_URL } from "./config";

// For route handlers: acts as the signed-in user, so database rules apply.
export async function supabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a place that can't set cookies; middleware refreshes them.
        }
      },
    },
  });
}

// The verified user id, or null if nobody is signed in.
export async function currentUserId(supabase: Awaited<ReturnType<typeof supabaseServer>>) {
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;
  return data.claims.sub as string;
}

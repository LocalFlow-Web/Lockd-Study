import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

// Where links in Supabase emails land (password reset, and later email
// confirmation). Turns the link into a signed-in session, then sends the
// person on to `next`.
//   ?code=...                    default Supabase emails (PKCE: works in the
//                                same browser the request was made from)
//   ?token_hash=...&type=...     custom email templates (works on any device)
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const nextParam = url.searchParams.get("next") ?? "/app";
  // Only ever redirect within this site.
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/app";

  const supabase = await supabaseServer();
  let ok = false;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) console.error("[auth/callback] code exchange failed", error.message);
    ok = !error;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (error) console.error("[auth/callback] token verify failed", error.message);
    ok = !error;
  }

  const target = url.clone();
  target.search = "";
  if (ok) {
    target.pathname = next;
  } else {
    target.pathname = "/login";
    target.searchParams.set("mode", "forgot");
    target.searchParams.set("error", "link");
  }
  return NextResponse.redirect(target);
}

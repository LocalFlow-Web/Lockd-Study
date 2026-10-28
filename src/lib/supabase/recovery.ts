import { createClient } from "@supabase/supabase-js";
import { SUPABASE_KEY, SUPABASE_URL } from "./config";

// Sends the password reset email.
//
// The main browser client always uses Supabase's "PKCE" links, which only
// work in the same browser the reset was requested from (Gmail opening in a
// different browser, or reading the email on your phone, breaks them). This
// one-off client asks for a plain link instead: Supabase puts the session in
// the link itself, so /reset-password can sign the person in on any device.
export function sendResetEmail(email: string) {
  const client = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
}

// Reads a session or error that Supabase put in the link (#access_token=...
// or #error=...), and removes it from the address bar.
export function takeSessionFromUrl():
  | { kind: "session"; access_token: string; refresh_token: string }
  | { kind: "error"; message: string }
  | null {
  const hash = new URLSearchParams(window.location.hash.slice(1));
  const query = new URLSearchParams(window.location.search);
  const get = (k: string) => hash.get(k) ?? query.get(k);

  const access_token = get("access_token");
  const refresh_token = get("refresh_token");
  const error = get("error_description") ?? get("error");
  if (!access_token && !error) return null;

  window.history.replaceState(null, "", window.location.pathname);
  if (access_token && refresh_token) return { kind: "session", access_token, refresh_token };
  return { kind: "error", message: error ?? "Link is invalid" };
}

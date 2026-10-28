// Supabase is optional while developing: without these two values the app
// runs in local mode (no login, everything saved in the browser, no limits).
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const authEnabled = Boolean(SUPABASE_URL && SUPABASE_KEY);

// Free accounts get this many uploads per rolling 24 hours.
export const DAILY_UPLOAD_LIMIT = Number(process.env.DAILY_UPLOAD_LIMIT || 3);

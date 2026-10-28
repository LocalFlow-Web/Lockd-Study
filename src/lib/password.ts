// Password rules for new accounts. Keep these in line with Supabase:
// Authentication → Sign In / Providers → Email → minimum length 8 and
// "Lowercase, uppercase letters, digits and symbols", so the server
// enforces the same thing even if someone skips this form.
export const PASSWORD_RULES = [
  { id: "length", label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { id: "upper", label: "An uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { id: "lower", label: "A lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { id: "number", label: "A number", test: (p: string) => /\d/.test(p) },
  { id: "symbol", label: "A symbol, like ! ? # or $", test: (p: string) => /[^A-Za-z0-9\s]/.test(p) },
] as const;

export function passwordIsStrong(p: string) {
  return PASSWORD_RULES.every((r) => r.test(p));
}

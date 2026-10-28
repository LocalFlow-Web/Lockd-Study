"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Wordmark } from "@/components/bits";
import { PasswordInput } from "@/components/PasswordInput";
import { passwordIsStrong } from "@/lib/password";
import { supabaseBrowser } from "@/lib/supabase/client";
import { takeSessionFromUrl } from "@/lib/supabase/recovery";

// The reset link in the email signs the person in and sends them here to
// pick a new password.
export default function ResetPasswordPage() {
  const router = useRouter();
  const [state, setState] = useState<"checking" | "ready" | "no-session">("checking");
  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const strong = passwordIsStrong(password);

  useEffect(() => {
    (async () => {
      // Read the link before anything else touches the address bar.
      const fromLink = takeSessionFromUrl();
      const supabase = supabaseBrowser();
      if (fromLink?.kind === "error") {
        setState("no-session");
        return;
      }
      if (fromLink?.kind === "session") {
        const { error } = await supabase.auth.setSession(fromLink);
        if (error) {
          setState("no-session");
          return;
        }
      }
      const { data } = await supabase.auth.getUser();
      setEmail(data.user?.email ?? null);
      setState(data.user ? "ready" : "no-session");
    })();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!strong) {
      setError("Your new password needs everything on the checklist.");
      return;
    }
    setBusy(true);
    const { error } = await supabaseBrowser().auth.updateUser({ password });
    setBusy(false);
    if (error) {
      const msg = error.message.toLowerCase();
      setError(
        error.code === "same_password" || msg.includes("different from the old")
          ? "That's your current password. Pick a new one."
          : error.code === "weak_password" || msg.includes("password should")
            ? "That password isn't strong enough. Make sure it ticks every box on the checklist."
            : msg.includes("session") || msg.includes("jwt")
              ? "This reset link has expired. Request a new one from the sign-in page."
              : error.message,
      );
      return;
    }
    router.replace("/app");
    router.refresh();
  }

  return (
    <div className="auth">
      <Wordmark />
      {state === "checking" ? null : state === "no-session" ? (
        <div className="auth-card">
          <h1>This link didn&apos;t work</h1>
          <p className="page-sub">
            Reset links expire after an hour and only work once. Send yourself a new one and use the newest email.
          </p>
          <Link href="/login?mode=forgot" className="btn btn-primary">
            Send a new reset email
          </Link>
        </div>
      ) : (
        <form className="auth-card" onSubmit={save}>
          <h1>Set a new password</h1>
          <p className="page-sub">{email ? `For ${email}.` : "Pick a new password for your account."}</p>
          <PasswordInput
            id="new-password"
            label="New password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            checklist
          />
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button className="btn btn-primary" type="submit" disabled={busy || !strong}>
            {busy ? "Saving…" : "Save new password"}
          </button>
        </form>
      )}
    </div>
  );
}

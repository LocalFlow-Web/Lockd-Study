"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Wordmark } from "@/components/bits";
import { authEnabled } from "@/lib/supabase/config";
import { supabaseBrowser } from "@/lib/supabase/client";

type Mode = "signin" | "signup";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next")?.startsWith("/app") ? params.get("next")! : "/app";
  const [mode, setMode] = useState<Mode>(params.get("mode") === "signup" ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (!authEnabled) {
    return (
      <p className="auth-note">
        Logins aren&apos;t set up yet, so the app runs in local mode. <Link href="/app">Open Lockd</Link>
      </p>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (mode === "signup" && password.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }
    setBusy(true);
    const supabase = supabaseBrowser();
    const { data, error } =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
    setBusy(false);

    if (error) {
      const msg = error.message.toLowerCase();
      setError(
        msg.includes("invalid login")
          ? "That email and password don't match. Check them, or create an account."
          : msg.includes("already registered")
            ? "There's already an account with that email. Sign in instead."
            : msg.includes("rate limit")
              ? "Too many tries. Wait a minute and try again."
              : error.message,
      );
      return;
    }
    if (!data.session) {
      // Email confirmation is on in Supabase.
      setNotice(`Check ${email} for a link to confirm your account, then sign in.`);
      setMode("signin");
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <form className="auth-card" onSubmit={submit}>
      <h1>{mode === "signin" ? "Sign in" : "Create your account"}</h1>
      <p className="page-sub">
        {mode === "signin"
          ? "Pick up where you left off. Your classes and study sets are saved to your account."
          : "Free to use. Your study sets sync across your laptop and phone."}
      </p>

      <label className="field">
        <span>Email</span>
        <input
          className="input"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label className="field">
        <span>Password</span>
        <input
          className="input"
          type="password"
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          required
          minLength={mode === "signup" ? 8 : undefined}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {mode === "signup" && <small>At least 8 characters</small>}
      </label>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="banner" role="status" style={{ margin: 0 }}>
          {notice}
        </p>
      )}

      <button className="btn btn-primary" type="submit" disabled={busy}>
        {busy ? "One sec…" : mode === "signin" ? "Sign in" : "Create account"}
      </button>

      <p className="auth-switch">
        {mode === "signin" ? "New to Lockd?" : "Already have an account?"}{" "}
        <button
          type="button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
          }}
        >
          {mode === "signin" ? "Create an account" : "Sign in"}
        </button>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="auth">
      <Wordmark />
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}

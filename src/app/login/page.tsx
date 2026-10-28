"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Wordmark } from "@/components/bits";
import { PASSWORD_RULES, passwordIsStrong } from "@/lib/password";
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
  const [showPassword, setShowPassword] = useState(false);
  const strong = passwordIsStrong(password);

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
    if (mode === "signup" && !strong) {
      setError("Your password needs everything on the checklist.");
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
          : error.code === "weak_password" || msg.includes("password should")
            ? "That password isn't strong enough. Make sure it ticks every box on the checklist."
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
      <div className="field">
        <label htmlFor="password">Password</label>
        <div className="password-wrap">
          <input
            id="password"
            className="input"
            type={showPassword ? "text" : "password"}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-describedby={mode === "signup" ? "password-rules" : undefined}
          />
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowPassword((v) => !v)}
            aria-pressed={showPassword}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
        {mode === "signup" && (
          <ul className="rules" id="password-rules" aria-label="Password requirements">
            {PASSWORD_RULES.map((r) => {
              const ok = r.test(password);
              return (
                <li key={r.id} data-ok={ok}>
                  <span className="rule-mark" aria-hidden="true">
                    {ok ? "✓" : ""}
                  </span>
                  {r.label}
                  <span className="visually-hidden">{ok ? " (done)" : " (missing)"}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

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

      <button className="btn btn-primary" type="submit" disabled={busy || (mode === "signup" && !strong)}>
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

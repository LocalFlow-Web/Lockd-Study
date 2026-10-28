"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Wordmark } from "@/components/bits";
import { PasswordInput } from "@/components/PasswordInput";
import { passwordIsStrong } from "@/lib/password";
import { supabaseBrowser } from "@/lib/supabase/client";
import { authEnabled } from "@/lib/supabase/config";
import { sendResetEmail } from "@/lib/supabase/recovery";

type Mode = "signin" | "signup" | "forgot";

// Turns Supabase auth errors into plain, actionable messages.
function friendly(error: { message: string; code?: string }): string {
  const msg = error.message.toLowerCase();
  const code = error.code ?? "";
  if (msg.includes("invalid login")) return "That email and password don't match. Check them, or create an account.";
  if (code === "same_password" || msg.includes("different from the old"))
    return "That's your current password. Pick a new one.";
  if (code === "weak_password" || msg.includes("password should"))
    return "That password isn't strong enough. Make sure it ticks every box on the checklist.";
  if (msg.includes("already registered")) return "There's already an account with that email. Sign in instead.";
  if (code === "otp_expired" || msg.includes("expired") || msg.includes("invalid"))
    return "That code is wrong or has expired. Check it, or send a new code.";
  if (code === "email_address_not_authorized" || msg.includes("not authorized"))
    return "Lockd can't send email to that address yet. Email sending is still being set up.";
  const wait = /after (\d+) seconds?/.exec(error.message);
  if (wait) return `Wait ${wait[1]} seconds before asking for another code.`;
  if (msg.includes("rate limit")) return "Too many tries. Wait a minute and try again.";
  return error.message;
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next")?.startsWith("/app") ? params.get("next")! : "/app";
  const initial = params.get("mode");
  const [mode, setMode] = useState<Mode>(initial === "signup" ? "signup" : initial === "forgot" ? "forgot" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(
    params.get("error") === "link"
      ? "That reset link didn't work. Links expire after an hour and only work once. Send a new one below."
      : null,
  );
  const [notice, setNotice] = useState<string | null>(null);

  // Forgot password: first send a code, then enter it with a new password.
  const [codeSent, setCodeSent] = useState(false);
  const [useCode, setUseCode] = useState(false);
  const [code, setCode] = useState("");
  const [verified, setVerified] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  if (!authEnabled) {
    return (
      <p className="auth-note">
        Logins aren&apos;t set up yet, so the app runs in local mode. <Link href="/app">Open Lockd</Link>
      </p>
    );
  }

  const strong = passwordIsStrong(password);

  function switchTo(m: Mode) {
    setMode(m);
    setError(null);
    setNotice(null);
    setPassword("");
    setCodeSent(false);
    setUseCode(false);
    setCode("");
    setVerified(false);
  }

  function done() {
    router.replace(next);
    router.refresh();
  }

  async function signInOrUp(e: React.FormEvent) {
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
      setError(friendly(error));
      return;
    }
    if (!data.session) {
      // Email confirmation is on in Supabase.
      setNotice(`Check ${email} for a link to confirm your account, then sign in.`);
      setMode("signin");
      return;
    }
    done();
  }

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    // The email's link opens /reset-password and works on any device.
    const { error } = await sendResetEmail(email.trim());
    setBusy(false);
    if (error) {
      setError(friendly(error));
      return;
    }
    setCodeSent(true);
    setCooldown(60);
    setNotice(
      `If there's an account for ${email.trim()}, we just sent it a reset email. Click the link in it to pick a new password. Check spam if it's not there in a minute.`,
    );
  }

  async function resetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!strong) {
      setError("Your new password needs everything on the checklist.");
      return;
    }
    setBusy(true);
    const supabase = supabaseBrowser();

    // The code signs them in; it only works once, so skip it on a retry.
    if (!verified) {
      const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "recovery" });
      if (error) {
        setBusy(false);
        setError(friendly(error));
        return;
      }
      setVerified(true);
    }

    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setError(friendly(error));
      return;
    }
    done();
  }

  if (mode === "forgot") {
    return (
      <form className="auth-card" onSubmit={useCode ? resetPassword : sendCode}>
        <h1>{useCode ? "Enter your code" : codeSent ? "Check your email" : "Reset your password"}</h1>
        <p className="page-sub">
          {useCode
            ? "Enter the code from the email and pick a new password."
            : codeSent
              ? "Click the reset link in the email. You can close this page."
              : "Enter the email you signed up with and we'll send you a link to reset your password."}
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
            readOnly={codeSent}
          />
        </label>

        {useCode && (
          <>
            {!verified && (
              <label className="field">
                <span>Code from the email</span>
                <input
                  className="input code-input"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6,10}"
                  maxLength={10}
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                />
              </label>
            )}
            <PasswordInput
              id="new-password"
              label="New password"
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
              checklist
            />
          </>
        )}

        {notice && (
          <p className="banner" role="status" style={{ margin: 0 }}>
            {notice}
          </p>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        {useCode ? (
          <button className="btn btn-primary" type="submit" disabled={busy || !strong || (!verified && code.length < 6)}>
            {busy ? "One sec…" : "Reset password"}
          </button>
        ) : !codeSent ? (
          <button className="btn btn-primary" type="submit" disabled={busy || !email}>
            {busy ? "Sending…" : "Send reset email"}
          </button>
        ) : null}

        <p className="auth-switch">
          {codeSent && !verified && (
            <>
              <button type="button" onClick={() => sendCode()} disabled={busy || cooldown > 0}>
                {cooldown > 0 ? `Send another email in ${cooldown}s` : "Send another email"}
              </button>
              <br />
              {!useCode && (
                <>
                  <button type="button" onClick={() => setUseCode(true)}>
                    Got a 6-digit code instead?
                  </button>
                  <br />
                </>
              )}
            </>
          )}
          <button type="button" onClick={() => switchTo("signin")}>
            Back to sign in
          </button>
        </p>
      </form>
    );
  }

  return (
    <form className="auth-card" onSubmit={signInOrUp}>
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

      <PasswordInput
        id="password"
        label="Password"
        value={password}
        onChange={setPassword}
        autoComplete={mode === "signin" ? "current-password" : "new-password"}
        checklist={mode === "signup"}
      />

      {mode === "signin" && (
        <button type="button" className="forgot-link" onClick={() => switchTo("forgot")}>
          Forgot your password?
        </button>
      )}

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
        <button type="button" onClick={() => switchTo(mode === "signin" ? "signup" : "signin")}>
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

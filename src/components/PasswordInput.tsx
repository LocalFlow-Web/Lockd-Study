"use client";

import { useState } from "react";
import { PASSWORD_RULES } from "@/lib/password";

// Password box with a show/hide toggle. With `checklist`, shows the strength
// rules under it, ticking each off as the person types (for new passwords).
export function PasswordInput({
  id,
  label,
  value,
  onChange,
  autoComplete,
  checklist = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: "current-password" | "new-password";
  checklist?: boolean;
}) {
  const [show, setShow] = useState(false);
  const rulesId = `${id}-rules`;

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="password-wrap">
        <input
          id={id}
          className="input"
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-describedby={checklist ? rulesId : undefined}
        />
        <button type="button" className="password-toggle" onClick={() => setShow((v) => !v)} aria-pressed={show}>
          {show ? "Hide" : "Show"}
        </button>
      </div>
      {checklist && (
        <ul className="rules" id={rulesId} aria-label="Password requirements">
          {PASSWORD_RULES.map((r) => {
            const ok = r.test(value);
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
  );
}

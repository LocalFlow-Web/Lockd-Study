"use client";

import { useEffect } from "react";

// If Supabase sends a reset link to the wrong page (for example the home page,
// when the redirect address isn't on its allow list), forward it to the reset
// page with the link details intact.
export function RecoveryForwarder() {
  useEffect(() => {
    if (window.location.pathname === "/reset-password") return;
    const raw = window.location.hash.slice(1) || window.location.search.slice(1);
    const params = new URLSearchParams(raw);
    const isRecovery =
      params.get("type") === "recovery" ||
      (params.get("error_code") === "otp_expired" && Boolean(params.get("error_description")));
    if (isRecovery) window.location.replace(`/reset-password#${raw}`);
  }, []);
  return null;
}

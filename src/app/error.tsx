"use client";

import AuthShell from "@/components/auth/auth-shell";
import { authCopy } from "@/lib/auth/copy";
import { usePreferences } from "@/lib/preferences";

export default function ErrorPage({ reset }: { reset: () => void }) {
  const { locale } = usePreferences();
  const t = authCopy[locale];
  return <AuthShell><h1>{t.unavailableTitle}</h1><p className="auth-subtitle">{t.unavailableNote}</p><button className="auth-submit" onClick={reset}>{t.retry}</button><p className="auth-switch"><a href="/login">{t.backLogin}</a></p></AuthShell>;
}

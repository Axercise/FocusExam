"use client";

import { authCopy, type AuthMessage } from "@/lib/auth/copy";
import { usePreferences } from "@/lib/preferences";

export default function SettingsStatus({ message }: { message?: AuthMessage }) {
  const { locale } = usePreferences();
  if (!message || message === "password_verified") return null;
  return <p className={`account-notice ${message === "password_updated" ? "success" : "error"}`} role="status">{authCopy[locale].messages[message]}</p>;
}

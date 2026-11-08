"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { Locale } from "./copy";

const key = "focusexam-preferences";
let temporaryPreferences: string | undefined;
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("preferences-change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("preferences-change", callback);
  };
}
function snapshot() {
  try { return temporaryPreferences ?? localStorage.getItem(key) ?? "{}"; }
  catch { return temporaryPreferences ?? "{}"; }
}
function serverSnapshot() { return "{}"; }

export function usePreferences() {
  const raw = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  let saved: { locale?: string; theme?: string } = {};
  try {
    const value = JSON.parse(raw);
    if (value && typeof value === "object") saved = value;
  } catch { /* Invalid preferences use defaults. */ }
  const locale: Locale = saved.locale === "en" ? "en" : "th";
  const theme = saved.theme === "dark" ? "dark" : "light";
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dataset.theme = theme;
  }, [locale, theme]);
  function updatePreferences(next: { locale?: Locale; theme?: "light" | "dark" }) {
    const value = JSON.stringify({ locale, theme, ...next });
    try { localStorage.setItem(key, value); temporaryPreferences = undefined; }
    catch { temporaryPreferences = value; }
    window.dispatchEvent(new Event("preferences-change"));
  }
  return { locale, theme, updatePreferences };
}

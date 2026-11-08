"use client";

import Link from "next/link";

import type { ReactNode } from "react";
import { ArrowLeft, BookOpen, Languages, Leaf, Moon, Sparkles, Sprout, Sun } from "lucide-react";
import { usePreferences } from "@/lib/preferences";
import { copy } from "@/lib/copy";
import { authCopy } from "@/lib/auth/copy";

export default function AuthShell({ children }: { children: ReactNode }) {
  const { locale, theme, updatePreferences } = usePreferences();
  const t = authCopy[locale];
  const common = copy[locale];
  return <div className="auth-layout">
    <header className="auth-header">
      <Link className="brand" href="/"><span className="brand-mark"><Sprout size={25} /></span><span>Focus<span className="brand-accent">Exam</span><small>YOUR LITTLE SPACE TO GROW</small></span></Link>
      <div className="auth-toolbar">
        <button type="button" className="language-button" aria-label={common.language} onClick={() => updatePreferences({ locale: locale === "th" ? "en" : "th" })}><Languages size={18} /><span>{locale === "th" ? "EN" : "ไทย"}</span></button>
        <button type="button" className="icon-button" aria-label={theme === "light" ? common.dark : common.light} onClick={() => updatePreferences({ theme: theme === "light" ? "dark" : "light" })}>{theme === "light" ? <Moon size={19} /> : <Sun size={19} />}</button>
      </div>
    </header>
    <main className="auth-main">
      <section className="auth-story" aria-label="FocusExam">
        <span className="auth-eyebrow"><Sparkles size={15} />{t.privacy}</span>
        <h2>{t.heroTitle}</h2>
        <p>{t.heroNote}</p>
        <div className="auth-scene" aria-hidden="true"><div className="scene-sun" /><span className="scene-spark one">✦</span><span className="scene-spark two">✧</span><div className="scene-hill back" /><div className="scene-hill front" /><div className="scene-plant"><Sprout size={120} strokeWidth={1.2} /><span /></div><div className="scene-book"><BookOpen size={66} strokeWidth={1.2} /></div></div>
        <Link className="auth-demo-link" href="/"><ArrowLeft size={15} />{t.tryDemo}</Link>
      </section>
      <section className="auth-panel card">{children}</section>
    </main>
    <div className="auth-footer"><Leaf size={14} />{common.footer}</div>
  </div>;
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ArrowLeft, ChevronRight, Languages, Moon, ShieldCheck, Sprout, Sun, UserRound } from "lucide-react";
import { signOutAction } from "@/lib/auth/actions";
import { accountCopy } from "@/lib/account/copy";
import type { AccountIdentity } from "@/lib/account/presentation";
import { usePreferences } from "@/lib/preferences";
import { SignOutButton } from "@/components/auth/account-control";

export default function AccountShell({ account, children }: { account: AccountIdentity; children: ReactNode }) {
  const pathname = usePathname();
  const { locale, theme, updatePreferences } = usePreferences();
  const t = accountCopy[locale];
  // Add future settings sections here, with their own route and content component.
  const sections = [
    { href: "/account/profile", label: t.profile, description: t.profileNote, icon: UserRound },
    { href: "/account/security", label: t.security, description: t.passwordNote, icon: ShieldCheck },
  ];
  const active = sections.find(section => pathname === section.href);
  return <div className="account-page">
    <a className="skip-link" href="#account-content">{t.settings}</a>
    <header className="account-header">
      <Link className="account-brand" href="/"><span className="brand-mark"><Sprout size={25} /></span><span>Focus<span className="brand-accent">Exam</span></span></Link>
      <div className="account-toolbar">
        <button type="button" className="account-tool" onClick={() => updatePreferences({ locale: locale === "th" ? "en" : "th" })} aria-label={t.language}><Languages size={17} />{locale === "th" ? "EN" : "ไทย"}</button>
        <button type="button" className="account-tool" aria-label={t.theme} onClick={() => updatePreferences({ theme: theme === "light" ? "dark" : "light" })}>{theme === "light" ? <Moon size={18} /> : <Sun size={18} />}</button>
        <form action={signOutAction}><SignOutButton locale={locale} iconOnly /></form>
      </div>
    </header>
    <main id="account-content" className="account-main">
      <Link className="account-back" href="/"><ArrowLeft size={16} />{t.back}</Link>
      <div className="account-heading"><span className="account-eyebrow">{t.settings}</span><h1>{active?.label ?? t.title}</h1><p>{active?.description ?? t.subtitle}</p></div>
      <div className="account-layout">
        <aside className="account-sidebar">
          <div className="account-identity"><div className="account-avatar">{Array.from(account.displayName)[0]?.toLocaleUpperCase() || <Sprout size={28} />}<span><Sprout size={15} /></span></div><strong>{account.displayName}</strong><p>{account.maskedEmail}</p></div>
          <nav aria-label={t.settings}>{sections.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}><Icon size={18} />{label}<ChevronRight size={15} /></Link>)}</nav>
          <div className="account-garden-note"><Sprout size={25} /><p>{t.privateNote}</p></div>
        </aside>
        <div className="account-sections">{children}</div>
      </div>
    </main>
    <div className="account-footer"><Sprout size={14} /><span>{t.yourSpace} · FocusExam</span></div>
  </div>;
}

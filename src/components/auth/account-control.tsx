"use client";

import Link from "next/link";

import { LoaderCircle, LogOut, UserRound } from "lucide-react";
import { useFormStatus } from "react-dom";
import { authCopy } from "@/lib/auth/copy";
import type { Locale } from "@/lib/copy";
import type { AccountSummary } from "@/lib/auth/types";
import { signOutAction } from "@/lib/auth/actions";

export function SignOutButton({ locale, iconOnly = false }: { locale: Locale; iconOnly?: boolean }) {
  const { pending } = useFormStatus();
  const label = pending ? authCopy[locale].pending : authCopy[locale].logout;
  return <button className={iconOnly ? "account-signout icon-button" : "auth-secondary"} disabled={pending} aria-label={label} title={label}>{pending ? <LoaderCircle className="spin" size={18} /> : <LogOut size={18} />}{!iconOnly && label}</button>;
}

export default function AccountControl({ account, locale }: { account: AccountSummary | null; locale: Locale }) {
  const t = authCopy[locale];
  if (!account) return <Link className="account-login" href="/login"><UserRound size={16} />{t.login}</Link>;
  return <div className="account-controls"><Link className="account-link" href="/account" aria-label={t.account}><UserRound size={18} /><span>{account.displayName}</span><small className="account-role">{t[account.role]}</small></Link><form action={signOutAction}><SignOutButton locale={locale} iconOnly /></form></div>;
}

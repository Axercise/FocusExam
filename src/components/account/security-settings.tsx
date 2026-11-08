"use client";

import { useActionState, useEffect, useState } from "react";
import { KeyRound, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { updatePasswordAction } from "@/lib/auth/actions";
import { authCopy, type AuthMessage } from "@/lib/auth/copy";
import { requestPasswordVerification, type AccountState } from "@/lib/account/actions";
import { accountCopy } from "@/lib/account/copy";
import type { SecuritySettings } from "@/lib/account/presentation";
import { usePreferences } from "@/lib/preferences";
import SettingsStatus from "./settings-status";

export default function SecuritySettingsPanel({ security, message }: { security: SecuritySettings; message?: AuthMessage }) {
  const { locale } = usePreferences();
  const t = accountCopy[locale];
  const a = authCopy[locale];
  const [emailState, emailAction, sendingEmail] = useActionState<AccountState, FormData>(requestPasswordVerification, {});
  const [passwordState, passwordAction, savingPassword] = useActionState(updatePasswordAction, {});
  const [expired, setExpired] = useState(false);
  useEffect(() => {
    if (!security.passwordVerifiedUntil) return;
    const timer = setTimeout(() => setExpired(true), Math.max(0, Date.parse(security.passwordVerifiedUntil) - Date.now()));
    return () => clearTimeout(timer);
  }, [security.passwordVerifiedUntil]);
  const verified = Boolean(security.passwordVerifiedUntil) && !expired;
  const date = (value: string) => new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", {
    dateStyle: "medium", timeStyle: "short", timeZone: security.timezone,
  }).format(new Date(value));
  const notice = (state: AccountState) => state.message && <p className={`account-notice ${state.success ? "success" : "error"}`} role="status">{t.messages[state.message]}</p>;
  return <><SettingsStatus message={message} /><section className="account-card" id="security">
            <div className="account-section-title"><span className="account-section-icon blue"><ShieldCheck size={21} /></span><div><h2>{t.password}</h2><p>{t.passwordNote}</p></div></div>
            {verified ? <div className="account-password-area">
              <div className="account-verified"><ShieldCheck size={19} /><div><strong>{t.verified}</strong><p>{t.expires} {date(security.passwordVerifiedUntil!)}</p></div></div>
              <form action={passwordAction} className="account-form">
                <label htmlFor="account-password">{a.newPassword}</label><input id="account-password" type="password" name="password" autoComplete="new-password" minLength={8} maxLength={128} required aria-describedby="account-password-help" />
                <p className="account-help" id="account-password-help">{a.passwordHelp}</p>
                <label htmlFor="account-confirm">{a.confirmPassword}</label><input id="account-confirm" type="password" name="confirmPassword" autoComplete="new-password" minLength={8} maxLength={128} required />
                {passwordState.message && <p className="account-notice error" role="status">{a.messages[passwordState.message]}</p>}
                <button className="account-primary" disabled={savingPassword}><KeyRound size={16} />{savingPassword ? t.pending : a.savePassword}</button>
              </form>
            </div> : <div className="account-locked">
              <span className="account-lock-icon"><LockKeyhole size={24} /></span><div><h3>{expired ? t.expired : t.locked}</h3><p>{t.lockedNote}</p><span className="account-recipient">{security.maskedEmail}</span>
                <form action={emailAction}><button className="account-outline" disabled={sendingEmail || emailState.success}><Mail size={16} />{sendingEmail ? a.pending : t.verify}</button></form>
                {notice(emailState)}{emailState.success && <p className="account-help">{t.sentNote}</p>}
              </div>
            </div>}
          </section></>;
}

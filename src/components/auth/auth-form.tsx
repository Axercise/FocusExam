"use client";

import Link from "next/link";

import { useActionState, useState } from "react";
import { Eye, EyeOff, LoaderCircle, LockKeyhole, Mail, Sprout } from "lucide-react";
import AuthShell from "./auth-shell";
import { authCopy, type AuthMessage, type AuthState } from "@/lib/auth/copy";
import { googleAction, loginAction, requestResetAction, signupAction, updatePasswordAction } from "@/lib/auth/actions";
import { usePreferences } from "@/lib/preferences";

export type AuthMode = "login" | "register" | "forgot" | "reset";
const actions = { login: loginAction, register: signupAction, forgot: requestResetAction, reset: updatePasswordAction };

export default function AuthForm({ mode, initialMessage }: { mode: AuthMode; initialMessage?: AuthMessage }) {
  const { locale } = usePreferences();
  const t = authCopy[locale];
  const [state, action, pending] = useActionState<AuthState, FormData>(actions[mode], {
    message: initialMessage, success: initialMessage === "signed_out" || initialMessage === "password_updated",
  });
  const [googleState, google, googlePending] = useActionState<AuthState, FormData>(googleAction, {});
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const isPassword = mode !== "forgot";
  const isNewPassword = mode === "register" || mode === "reset";
  const showGoogle = mode === "login" || mode === "register";
  const title = { login: t.loginTitle, register: t.registerTitle, forgot: t.forgotTitle, reset: t.resetTitle }[mode];
  const note = { login: t.loginNote, register: t.registerNote, forgot: t.forgotNote, reset: t.resetNote }[mode];
  const button = { login: t.login, register: t.register, forgot: t.sendReset, reset: t.savePassword }[mode];
  return <AuthShell>
    <span className="auth-panel-icon">{mode === "forgot" ? <Mail size={24} /> : mode === "reset" ? <LockKeyhole size={24} /> : <Sprout size={25} />}</span>
    <h1>{title}</h1><p className="auth-subtitle">{note}</p>
    {showGoogle && <>
      <form action={google} className="google-form">
        <button className="google-button" disabled={pending || googlePending}>{googlePending ? <LoaderCircle size={18} className="spin" /> : <span className="google-letter" aria-hidden="true">G</span>}{googlePending ? t.pending : t.google}</button>
      </form>
      {googleState.message && <p className="auth-message error" role="alert">{t.messages[googleState.message]}</p>}
      <div className="auth-divider"><span />{t.or}<span /></div>
    </>}
    <form action={action} className="auth-form">
      {mode === "register" && <div className="field"><label htmlFor="name">{t.name}</label><input id="name" name="name" value={name} onChange={e => setName(e.target.value)} autoComplete="nickname" required maxLength={80} /></div>}
      {mode !== "reset" && <div className="field"><label htmlFor="email">{t.email}</label><input id="email" name="email" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" inputMode="email" required maxLength={254} /></div>}
      {isPassword && <div className="field"><div className="field-label"><label htmlFor="password">{mode === "reset" ? t.newPassword : t.password}</label>{mode === "login" && <Link href="/forgot-password">{t.forgot}</Link>}</div><div className="password-field"><input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete={isNewPassword ? "new-password" : "current-password"} required minLength={isNewPassword ? 8 : 1} maxLength={isNewPassword ? 128 : 1024} aria-describedby={isNewPassword ? "password-help" : undefined} /><button type="button" className="password-toggle" aria-label={showPassword ? t.hidePassword : t.showPassword} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>{isNewPassword && <small id="password-help">{t.passwordHelp}</small>}</div>}
      {isNewPassword && <div className="field"><label htmlFor="confirm-password">{t.confirmPassword}</label><input id="confirm-password" name="confirmPassword" type={showPassword ? "text" : "password"} autoComplete="new-password" required minLength={8} maxLength={128} /></div>}
      {state.message && <div className={`auth-message ${state.success ? "success" : "error"}`} role={state.success ? "status" : "alert"}>{t.messages[state.message]}{state.success && (state.message === "confirm_email" || state.message === "reset_sent") && <small>{t.emailHint}</small>}</div>}
      <button className="auth-submit" disabled={pending || googlePending}>{pending && <LoaderCircle size={17} className="spin" />}{pending ? t.pending : button}</button>
    </form>
    <p className="auth-switch">{mode === "login" ? <>{t.noAccount} <Link href="/register">{t.register}</Link></> : mode === "register" ? <>{t.haveAccount} <Link href="/login">{t.login}</Link></> : <Link href="/login">{t.backLogin}</Link>}</p>
  </AuthShell>;
}

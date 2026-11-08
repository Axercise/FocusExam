"use client";

import { useActionState } from "react";
import { Check, Clock3, LockKeyhole, Mail, UserRound } from "lucide-react";
import { renameDisplayName } from "@/lib/account/actions";
import { accountCopy } from "@/lib/account/copy";
import type { ProfileSettings } from "@/lib/account/presentation";
import type { AuthMessage } from "@/lib/auth/copy";
import { usePreferences } from "@/lib/preferences";
import SettingsStatus from "./settings-status";

export default function ProfileSettingsPanel({ profile, message }: { profile: ProfileSettings; message?: AuthMessage }) {
  const { locale } = usePreferences();
  const t = accountCopy[locale];
  const [nameState, nameAction, savingName] = useActionState(renameDisplayName, {});
  const date = (value: string) => new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", {
    dateStyle: "medium", timeStyle: "short", timeZone: profile.timezone,
  }).format(new Date(value));
  const notice = (state: typeof nameState) => state.message && <p className={`account-notice ${state.success ? "success" : "error"}`} role="status">{t.messages[state.message]}</p>;
  return <><SettingsStatus message={message} /><section className="account-card" id="profile">
            <div className="account-section-title"><span className="account-section-icon"><UserRound size={21} /></span><div><h2>{t.profile}</h2><p>{t.profileNote}</p></div></div>
            <form action={nameAction} className="account-form">
              <label htmlFor="display-name">{t.name}</label>
              <div className="account-name-row"><input id="display-name" name="displayName" defaultValue={profile.displayName} required disabled={!profile.canRename || savingName} autoComplete="nickname" aria-describedby="name-help name-cooldown" /><button className="account-primary" disabled={!profile.canRename || savingName}>{savingName ? t.pending : t.saveName}{!savingName && <Check size={16} />}</button></div>
              <p id="name-help" className="account-help">{t.nameHelp}</p>
              <div id="name-cooldown">{!profile.canRename && profile.nextNameChangeAt && <p className="account-cooldown"><Clock3 size={15} /><span>{t.nextChange} <strong>{date(profile.nextNameChangeAt)}</strong></span></p>}</div>
              {notice(nameState)}
            </form>
            <div className="account-email"><span className="account-email-icon"><Mail size={19} /></span><div><h3>{t.email}</h3><p>{profile.maskedEmail}</p><small>{t.emailNote}</small></div><LockKeyhole size={16} /></div>
          </section></>;
}

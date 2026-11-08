"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Check, LockKeyhole, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { saveTrackAction } from "@/lib/tracks/actions";
import { tracksCopy } from "@/lib/tracks/copy";
import { trackColors, trackIcons, trackBackgrounds, type PersonalTrack, type TrackActionState, type TrackColor, type TrackIconName, type TrackMessage } from "@/lib/tracks/model";
import { usePreferences } from "@/lib/preferences";
import { useCosmetics } from "@/components/cosmetics/cosmetics-provider";
import { ownsCosmetic } from "@/lib/cosmetics/model";
import TrackIcon from "./track-icon";

export default function TrackEditor({ track, onClose, onSaved }: {
  track?: PersonalTrack; onClose: () => void; onSaved: (message: TrackMessage) => void;
}) {
  const { locale } = usePreferences();
  const { owned } = useCosmetics();
  const t = tracksCopy[locale];
  const dialog = useRef<HTMLDialogElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(track?.name ?? "");
  const [description, setDescription] = useState(track?.description ?? "");
  const [color, setColor] = useState<TrackColor>(track?.color ?? "mint");
  const [icon, setIcon] = useState<TrackIconName>(track?.icon ?? "book");
  const [background, setBackground] = useState(track?.background ?? "plain");
  const lockedText = locale === "th" ? "ยังไม่ปลดล็อก" : "Locked";
  const [state, action, pending] = useActionState<TrackActionState, FormData>(async (previous, form) => {
    const result = await saveTrackAction(previous, form);
    if (result.success && result.message) {
      dialog.current?.close();
      onSaved(result.message);
    }
    return result;
  }, {});
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    nameInput.current?.focus();
    return () => element?.close();
  }, []);
  return <dialog className="track-dialog" ref={dialog} onClose={event => { if (!event.currentTarget.open) onClose(); }} onCancel={event => { if (pending) event.preventDefault(); }} aria-labelledby="track-dialog-title">
    <div className="track-dialog-heading"><span className={`personal-track-icon track-color-${color}`}><TrackIcon name={icon} size={26} /></span><div><p>{t.eyebrow}</p><h2 id="track-dialog-title">{track ? t.editTitle : t.newTitle}</h2></div><button className="track-icon-button" type="button" onClick={() => dialog.current?.close()} disabled={pending} aria-label={t.close}><X size={21} /></button></div>
    <form action={action} className="track-form">
      <input type="hidden" name="trackId" value={track?.id ?? ""} />
      <label htmlFor="track-name">{t.name}</label>
      <input ref={nameInput} id="track-name" name="name" value={name} onChange={event => setName(event.target.value)} required placeholder={t.nameHint} aria-describedby="track-name-help" disabled={pending} />
      <p id="track-name-help" className="track-field-help">{t.nameLimit} <span>{[...name].length}/80</span></p>
      <label htmlFor="track-description">{t.description} <small>{t.optional}</small></label>
      <textarea id="track-description" name="description" value={description} onChange={event => setDescription(event.target.value)} rows={3} placeholder={t.descriptionHint} aria-describedby="track-description-help" disabled={pending} />
      <p id="track-description-help" className="track-field-help">{t.descriptionLimit}<span>{[...description].length}/280</span></p>
      <fieldset disabled={pending}><legend>{t.color}</legend><div className="track-color-options">{trackColors.map(value => { const locked = !ownsCosmetic(owned, "color", value); return <label className={`track-color-choice track-color-${value}${locked ? " cosmetic-option-locked" : ""}`} key={value} title={`${t.colors[value]}${locked ? ` · ${lockedText}` : ""}`}><input type="radio" name="color" value={value} checked={color === value} disabled={locked} onChange={() => setColor(value)} aria-label={`${t.colors[value]}${locked ? ` · ${lockedText}` : ""}`} /><span>{locked ? <LockKeyhole size={12} /> : color === value && <Check size={17} />}</span></label>; })}</div></fieldset>
      <fieldset disabled={pending}><legend>{t.icon}</legend><div className="track-icon-options">{trackIcons.map(value => { const locked = !ownsCosmetic(owned, "icon", value); return <label className={`track-icon-choice ${icon === value ? "selected" : ""}${locked ? " cosmetic-option-locked" : ""}`} key={value} title={`${t.icons[value]}${locked ? ` · ${lockedText}` : ""}`}><input type="radio" name="icon" value={value} checked={icon === value} disabled={locked} onChange={() => setIcon(value)} aria-label={`${t.icons[value]}${locked ? ` · ${lockedText}` : ""}`} /><TrackIcon name={value} size={21} />{locked && <LockKeyhole className="cosmetic-option-lock" size={10} />}</label>; })}</div></fieldset>
      <fieldset disabled={pending}><legend>{locale === "th" ? "พื้นหลัง Track" : "Track background"}</legend><div className="track-background-options">{trackBackgrounds.map(value => { const locked = !ownsCosmetic(owned, "background", value); return <label className={`track-background-choice track-bg-${value}${background === value ? " selected" : ""}${locked ? " cosmetic-option-locked" : ""}`} key={value}><input type="radio" name="background" value={value} checked={background === value} disabled={locked} onChange={() => setBackground(value)} /><span>{t.backgrounds[value]}{locked ? <LockKeyhole size={12} /> : background === value && <Check size={14} />}</span></label>; })}</div></fieldset>
      <Link href="/cosmetics" className="cosmetic-more-link"><Sparkles size={16} />{locale === "th" ? "ดูเพิ่มเติมและปลดล็อกของตกแต่ง" : "Discover and unlock more decorations"} →</Link>
      {state.message && !state.success && <p className="track-notice error" role="alert">{t.messages[state.message]}{state.message === "auth_required" && <> <Link href="/login">{locale === "th" ? "เข้าสู่ระบบ" : "Sign in"}</Link></>}</p>}
      <div className="track-dialog-actions"><button className="track-secondary" type="button" onClick={() => dialog.current?.close()} disabled={pending}>{t.cancel}</button><button className="track-primary" disabled={pending}>{pending ? t.pending : t.save}<Check size={16} /></button></div>
    </form>
  </dialog>;
}

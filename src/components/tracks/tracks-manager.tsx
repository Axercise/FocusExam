"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Archive, ArchiveRestore, ArrowLeft, ArrowRight, BookOpen, ChevronLeft, ChevronRight, Languages, Moon, Pencil, Plus, Sprout, Sun } from "lucide-react";
import type { AccountSummary } from "@/lib/auth/types";
import AccountControl from "@/components/auth/account-control";
import { archiveTrackAction } from "@/lib/tracks/actions";
import { tracksCopy } from "@/lib/tracks/copy";
import type { TrackListData } from "@/lib/tracks/data";
import type { PersonalTrack, TrackActionState, TrackMessage } from "@/lib/tracks/model";
import { usePreferences } from "@/lib/preferences";
import TrackEditor from "./track-editor";
import TrackIcon from "./track-icon";
import { formatElapsed } from "@/lib/timer/model";
import { sessionCopy } from "@/lib/sessions/copy";

function ArchiveControl({ track, onUpdated }: { track: PersonalTrack; onUpdated: (message: TrackMessage) => void }) {
  const { locale } = usePreferences();
  const t = tracksCopy[locale];
  const archived = Boolean(track.archived_at);
  const [state, action, pending] = useActionState<TrackActionState, FormData>(async (previous, form) => {
    const result = await archiveTrackAction(previous, form);
    if (result.success && result.message) onUpdated(result.message);
    return result;
  }, {});
  return <form action={action} className="track-archive-form">
    <input type="hidden" name="trackId" value={track.id} /><input type="hidden" name="operation" value={archived ? "restore" : "archive"} />
    <button className="track-card-button" disabled={pending} title={archived ? t.restore : t.archiveNote}>{archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}{pending ? t.pending : archived ? t.restore : t.archive}</button>
    {state.message && !state.success && <p role="alert" className="track-inline-error">{t.messages[state.message]}</p>}
  </form>;
}

export default function TracksManager({ account, data }: { account: AccountSummary; data: TrackListData }) {
  const { locale, theme, updatePreferences } = usePreferences();
  const t = tracksCopy[locale];
  const [editor, setEditor] = useState<{ track?: PersonalTrack } | null>(null);
  const [notice, setNotice] = useState<TrackMessage>();
  const archived = data.view === "archived";
  const pageHref = (page: number) => `/tracks?view=${data.view}&page=${page}`;
  return <div className="tracks-page">
    <a className="skip-link" href="#tracks-content">{t.title}</a>
    <header className="tracks-header"><Link className="account-brand" href="/"><span className="brand-mark"><Sprout size={25} /></span><span>Focus<span className="brand-accent">Exam</span></span></Link><div className="tracks-toolbar">
      <button className="account-tool" type="button" onClick={() => updatePreferences({ locale: locale === "th" ? "en" : "th" })} aria-label={locale === "th" ? "Switch to English" : "เปลี่ยนเป็นภาษาไทย"}><Languages size={17} />{locale === "th" ? "EN" : "ไทย"}</button>
      <button className="account-tool" type="button" onClick={() => updatePreferences({ theme: theme === "light" ? "dark" : "light" })} aria-label={locale === "th" ? "เปลี่ยนธีม" : "Change theme"}>{theme === "light" ? <Moon size={18} /> : <Sun size={18} />}</button>
      <AccountControl account={account} locale={locale} />
    </div></header>
    <main id="tracks-content" className="tracks-main">
      <Link className="account-back" href="/"><ArrowLeft size={16} />{t.back}</Link>
      <div className="tracks-heading"><div><span className="account-eyebrow">{t.eyebrow}</span><h1>{t.title}</h1><p>{t.subtitle}</p></div><button className="track-primary" onClick={() => setEditor({})}><Plus size={18} />{t.add}</button></div>
      <div className="tracks-summary"><span className="tracks-summary-icon"><BookOpen size={26} /></span><div><strong>{data.activeCount + data.archivedCount}</strong><span>{t.total}</span></div><Sprout className="tracks-summary-sprout" size={55} strokeWidth={1.1} /></div>
      <nav className="tracks-filters" aria-label={locale === "th" ? "สถานะ Track" : "Track status"}><Link href="/tracks" aria-current={!archived ? "page" : undefined}><BookOpen size={16} />{t.active}<span>{data.activeCount}</span></Link><Link href="/tracks?view=archived" aria-current={archived ? "page" : undefined}><Archive size={16} />{t.archived}<span>{data.archivedCount}</span></Link></nav>
      {notice && <p className="track-notice success" role="status">{t.messages[notice]}</p>}
      {data.tracks.length ? <div className="personal-track-grid">{data.tracks.map(track => <article key={track.id} className={`personal-track-card track-bg-${track.background}`} data-track-color={track.color}>
        <div className="personal-track-top"><span className={`personal-track-icon track-color-${track.color}`}><TrackIcon name={track.icon} /></span><span className="track-card-kicker">{archived ? <Archive size={13} /> : <Sprout size={13} />}{archived ? t.archived : t.active}</span></div>
        <h2><Link className="track-title-link" href={`/tracks/${track.id}`}>{track.name}</Link></h2><p className="personal-track-description">{track.description || t.noDescription}</p>
        <p className="personal-track-saved-time"><span>{sessionCopy[locale].total}</span><strong>{formatElapsed(track.total_seconds)}</strong></p>
        <Link className="track-open-detail" href={`/tracks/${track.id}`}>{locale==="th"?"ดูรายละเอียด":"View details"}<ArrowRight size={15}/></Link>
        <div className="track-card-actions">{!archived && <button className="track-card-button" onClick={() => setEditor({ track })}><Pencil size={15} />{t.edit}</button>}<ArchiveControl track={track} onUpdated={setNotice} /></div>
      </article>)}</div> : <div className="tracks-empty"><span><Archive size={40} strokeWidth={1.3} /></span><h2>{archived ? t.archiveEmptyTitle : t.emptyTitle}</h2><p>{archived ? t.archiveEmptyNote : t.emptyNote}</p>{!archived && <button className="track-primary" onClick={() => setEditor({})}><Plus size={17} />{t.first}</button>}</div>}
      {archived && <p className="tracks-archive-note"><Archive size={15} />{t.archiveNote}</p>}
      {data.pages > 1 && <nav className="tracks-pagination" aria-label={t.page}>{data.page > 1 ? <Link href={pageHref(data.page - 1)}><ChevronLeft size={16} />{t.previous}</Link> : <span aria-disabled="true"><ChevronLeft size={16} />{t.previous}</span>}<span>{t.page} {data.page} {t.of} {data.pages}</span>{data.page < data.pages ? <Link href={pageHref(data.page + 1)}>{t.next}<ChevronRight size={16} /></Link> : <span aria-disabled="true">{t.next}<ChevronRight size={16} /></span>}</nav>}
      <p className="tracks-timer-note"><Sprout size={15} />{t.timerNote}</p>
      <Link className="study-history-link" href="/history">{sessionCopy[locale].history}</Link>
      <Link href="/" className="tracks-home-link">{t.back}<ArrowRight size={15} /></Link>
    </main>
    {editor && <TrackEditor track={editor.track} onClose={() => setEditor(null)} onSaved={message => { setNotice(message); setEditor(null); }} />}
  </div>;
}

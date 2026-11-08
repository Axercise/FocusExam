"use client";

import Link from "next/link";
import { statisticsCopy } from "@/lib/statistics/copy";
import { ArrowLeft, BookOpen, ChevronLeft, ChevronRight, Clock3, Languages, Moon, Sprout, Sun } from "lucide-react";
import { sessionCopy } from "@/lib/sessions/copy";
import { timerCopy } from "@/lib/timer/copy";
import { formatElapsed } from "@/lib/timer/model";
import { usePreferences } from "@/lib/preferences";
type Session = { id: string; mode: string; duration_seconds: number; recap: string; ended_at: string; timezone: string; allocation_status: string; tracks: { name: string } | null };

export default function StudyHistory({ sessions, page, pages, timezone }: { sessions: Session[]; page: number; pages: number; timezone: string }) {
  const {locale,theme,updatePreferences}=usePreferences();const t=sessionCopy[locale],timer=timerCopy[locale];
  const date=(value:string,zone:string)=>new Intl.DateTimeFormat(locale==="th"?"th-TH":"en-GB",{dateStyle:"medium",timeStyle:"short",timeZone:zone}).format(new Date(value));
  return <div className="tracks-page"><header className="tracks-header"><Link className="account-brand" href="/"><span className="brand-mark"><Sprout size={25}/></span><span>Focus<span className="brand-accent">Exam</span></span></Link><div className="tracks-toolbar"><button className="account-tool" onClick={()=>updatePreferences({locale:locale==="th"?"en":"th"})} aria-label={locale==="th"?"Switch to English":"เปลี่ยนเป็นภาษาไทย"}><Languages size={17}/>{locale==="th"?"EN":"ไทย"}</button><button className="account-tool" onClick={()=>updatePreferences({theme:theme==="light"?"dark":"light"})} aria-label={locale==="th"?"เปลี่ยนธีม":"Change theme"}>{theme==="light"?<Moon size={18}/>:<Sun size={18}/>}</button></div></header>
    <main className="tracks-main"><Link href="/" className="account-back"><ArrowLeft size={16}/>{t.back}</Link><div className="tracks-heading"><h1>{t.history}</h1><Link href="/tracks" className="track-secondary"><BookOpen size={16}/>{t.manage}</Link></div>
      {sessions.length ? <div className="session-history-list">{sessions.map(session=><article className="session-history-card" key={session.id}><div><span className="session-history-mode">{session.mode==="lockin"?timer.lockin:session.mode==="break"?timer.break:timer.focus}</span><h2>{session.tracks?.name ?? timer.break}</h2><span><Clock3 size={14}/>{date(session.ended_at,session.allocation_status==="precise"?session.timezone:timezone)}</span><small className={`history-allocation ${session.allocation_status==="precise"?"is-precise":""}`}>{session.allocation_status==="precise"?statisticsCopy[locale].precise:statisticsCopy[locale].old}{session.allocation_status==="precise"?` · ${session.timezone}`:""}</small></div><strong>{formatElapsed(session.duration_seconds)}</strong><p>{session.recap || t.noRecap}</p></article>)}</div> : <div className="tracks-empty"><Sprout size={40}/><h2>{t.emptyHistory}</h2><Link href="/" className="track-primary">{t.back}</Link></div>}
      {pages>1&&<nav className="tracks-pagination" aria-label={locale==="th"?"หน้าประวัติ":"History pages"}>{page>1?<Link href={`/history?page=${page-1}`}><ChevronLeft size={16}/>{locale==="th"?"ก่อนหน้า":"Previous"}</Link>:<span/>}<span>{page} / {pages}</span>{page<pages?<Link href={`/history?page=${page+1}`}>{locale==="th"?"ถัดไป":"Next"}<ChevronRight size={16}/></Link>:<span/>}</nav>}
    </main></div>;
}

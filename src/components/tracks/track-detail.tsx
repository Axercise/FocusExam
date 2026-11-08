"use client";

import Link from "next/link";
import Form from "next/form";
import {Archive,ArrowLeft,ArrowUpRight,BookOpen,CalendarDays,ChevronLeft,ChevronRight,Clock3,Languages,Moon,Sprout,Sun} from "lucide-react";
import AccountControl from "@/components/auth/account-control";
import TimeChart from "@/components/statistics/time-chart";
import {usePreferences} from "@/lib/preferences";
import type {AccountSummary} from "@/lib/auth/types";
import type {PersonalTrack} from "@/lib/tracks/model";
import {trackDetailHref,type TrackDetailData} from "@/lib/tracks/detail-model";
import {trackDetailCopy} from "@/lib/tracks/detail-copy";
import {statisticsCopy} from "@/lib/statistics/copy";
import {adjacentDate,clockDuration,validDate,type StatisticsView} from "@/lib/statistics/model";
import TrackIcon from "./track-icon";

export default function TrackDetail({track,data,view,date,account}:{track:PersonalTrack;data:TrackDetailData;view:StatisticsView;date:string;account:AccountSummary}){
 const {locale,theme,updatePreferences}=usePreferences(),t=trackDetailCopy[locale],s=statisticsCopy[locale];
 const summary=data.summary,history=data.history;
 const href=(v:StatisticsView,d:string,all=history.all,page=1,anchor=false)=>trackDetailHref(track.id,v,d,all,page,anchor);
 const formatDate=(value:string)=>new Intl.DateTimeFormat(locale==="th"?"th-TH":"en-GB",{day:"numeric",month:"short",year:"numeric",timeZone:"UTC"}).format(new Date(value+"T12:00:00Z"));
 const dates=(from:string,to:string)=>from===to?formatDate(from):`${formatDate(from)} – ${formatDate(to)}`;
 const previous=adjacentDate(view,date,-1),next=adjacentDate(view,date,1);
 const total=data.days.reduce((sum,day)=>sum+day.study_seconds,0);
 const cards=[
  {label:t.all,value:summary.all_seconds,sub:`${summary.session_count} ${t.rounds}`,Icon:BookOpen},
  {label:t.today,value:summary.today_seconds,sub:formatDate(data.today),Icon:Clock3},
  {label:t.week,value:summary.week_seconds,sub:t.weekNote,Icon:CalendarDays},
  {label:t.month,value:summary.month_seconds,sub:new Intl.DateTimeFormat(locale==="th"?"th-TH":"en-GB",{month:"long",year:"numeric",timeZone:"UTC"}).format(new Date(data.today+"T12:00:00Z")),Icon:Sprout},
 ];
 return <div className="tracks-page track-detail-page">
  <a className="skip-link" href="#track-detail-main">{track.name}</a>
  <header className="tracks-header"><Link className="account-brand" href="/"><span className="brand-mark"><Sprout size={25}/></span><span>Focus<span className="brand-accent">Exam</span></span></Link>
   <div className="tracks-toolbar"><button className="account-tool" type="button" onClick={()=>updatePreferences({locale:locale==="th"?"en":"th"})} aria-label={locale==="th"?"เปลี่ยนภาษา":"Change language"}><Languages size={17}/>{locale==="th"?"EN":"ไทย"}</button><button className="account-tool" type="button" onClick={()=>updatePreferences({theme:theme==="light"?"dark":"light"})} aria-label={locale==="th"?"เปลี่ยนธีม":"Change theme"}>{theme==="light"?<Moon size={18}/>:<Sun size={18}/>}</button><AccountControl account={account} locale={locale}/></div>
  </header>
  <main id="track-detail-main" className="tracks-main">
   <Link className="account-back" href={track.archived_at?"/tracks?view=archived":"/tracks"}><ArrowLeft size={16}/>{t.back}</Link>
   <section className="track-detail-heading"><span className={`personal-track-icon track-detail-icon track-color-${track.color}`}><TrackIcon name={track.icon} size={29}/></span><div><span className="account-eyebrow">TRACK / INSIGHTS</span><h1>{track.name}</h1><p>{track.description||t.title}</p></div><Link className="track-secondary" href="/">{t.focus}<ArrowUpRight size={16}/></Link></section>
   {track.archived_at&&<p className="track-archive-banner"><Archive size={17}/><strong>{t.archived}</strong><span>{t.archiveNote}</span></p>}
   <section className="track-detail-summary" aria-label={t.title}>{cards.map(({label,value,sub,Icon})=><article className="card" key={label}><div><p>{label}</p><Icon size={18} aria-hidden="true"/></div><strong>{clockDuration(value)}</strong><small>{sub}</small></article>)}</section>
   <section className="statistics-controls card">
    <nav className="statistics-tabs" aria-label={s.period}>{(["day","week","month"]as const).map(v=><Link href={href(v,date)} key={v} aria-current={view===v?"page":undefined}>{s[v]}</Link>)}</nav>
    <Form className="statistics-form" action={`/tracks/${track.id}`}><input type="hidden" name="view" value={view}/>{history.all&&<input type="hidden" name="history" value="all"/>}<label>{view==="month"?s.monthInput:s.date}<input required name={view==="month"?"month":"date"} type={view==="month"?"month":"date"} defaultValue={view==="month"?date.slice(0,7):date} min={view==="month"?"1900-01":"1900-01-01"} max={view==="month"?"9998-12":"9998-12-31"}/></label><button className="track-primary" type="submit">{s.apply}</button></Form>
    <p className="statistics-scope">{t.scope}</p>
   </section>
   <section className="statistics-chart-card card"><div className="statistics-period">
    {validDate(previous)?<Link className="account-tool" href={href(view,previous)} aria-label={s.previous}><ChevronLeft size={20}/></Link>:<span className="account-tool" aria-disabled="true"><ChevronLeft size={20}/></span>}
    <div><h2>{t.chart}</h2><p>{dates(data.from,data.to)}</p></div>
    {validDate(next)?<Link className="account-tool" href={href(view,next)} aria-label={s.next}><ChevronRight size={20}/></Link>:<span className="account-tool" aria-disabled="true"><ChevronRight size={20}/></span>}
    <Link className="text-button" href={href(view,data.today)}>{s.today}</Link>
   </div><div className="track-period-total"><span>{t.rangeTotal}</span><strong>{clockDuration(total)}</strong></div>
   {total===0&&<p className="track-chart-empty">{t.missing}</p>}<TimeChart days={data.days} locale={locale} studyOnly/>
   </section>
   <section id="track-history" className="track-detail-history"><div className="track-history-heading"><div><span className="account-eyebrow">YOUR LEARNING JOURNAL</span><h2>{t.history}<small>{history.total} {t.rounds}</small></h2><p>{history.all?t.allNote:t.rangeNote}</p></div><nav className="track-history-tabs" aria-label={t.history}><Link href={href(view,date,false,1,true)} aria-current={!history.all?"page":undefined}>{t.rangeHistory}</Link><Link href={href(view,date,true,1,true)} aria-current={history.all?"page":undefined}>{t.allHistory}</Link></nav></div>
    {history.sessions.length?<div className="track-session-list">{history.sessions.map(session=>{
     const first=history.all?session.first_date:session.range_first_date,last=history.all?session.last_date:session.range_last_date;
     const seconds=history.all?session.duration_seconds:session.range_seconds;
     const end=new Intl.DateTimeFormat(locale==="th"?"th-TH":"en-GB",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit",timeZone:session.timezone}).format(new Date(session.ended_at));
     return <article key={session.id} className="track-session card"><div className="track-session-top"><div><span className="track-session-mode">{session.mode==="lockin"?"Lock in":locale==="th"?"โฟกัส":"Focus"}</span><h3><CalendarDays size={15} aria-hidden="true"/>{first&&last?dates(first,last):t.legacy}</h3><p>{t.finished} <time dateTime={session.ended_at}>{end}</time> · {session.timezone}</p></div><div className="track-session-duration"><small>{history.all?t.fullRound:t.inRange}</small><strong>{clockDuration(seconds)}</strong>{!history.all&&seconds!==session.duration_seconds&&<span>{t.fullRound} {clockDuration(session.duration_seconds)}</span>}</div></div><div className="track-session-recap"><h4><BookOpen size={14} aria-hidden="true"/>{t.recap}</h4><p className={!session.recap?"is-empty":""}>{session.recap||t.noRecap}</p></div></article>;
    })}</div>:<div className="tracks-empty track-history-empty"><BookOpen size={30}/><h3>{summary.session_count===0?t.firstEmpty:t.empty}</h3><p>{summary.session_count===0?t.firstNote:t.emptyNote}</p>{summary.session_count===0?<Link className="track-primary" href="/">{t.focus}</Link>:!history.all&&<Link className="track-secondary" href={href(view,date,true,1,true)}>{t.allHistory}</Link>}</div>}
    {history.pages>1&&<nav className="tracks-pagination" aria-label={s.history}>{history.page>1?<Link href={href(view,date,history.all,history.page-1,true)}><ChevronLeft size={16}/>{s.previous}</Link>:<span/>}<span>{history.page} / {history.pages}</span>{history.page<history.pages?<Link href={href(view,date,history.all,history.page+1,true)}>{s.next}<ChevronRight size={16}/></Link>:<span/>}</nav>}
   </section>
   {summary.legacy_count>0&&<aside className="statistics-legacy card"><h2>{t.legacy} · {summary.legacy_count} {t.rounds}</h2><strong>{clockDuration(summary.legacy_seconds)}</strong><p>{t.legacyNote}</p></aside>}
   <p className="statistics-timezone">{t.timezone}<br/>{s.snapshot}</p>
  </main>
 </div>;
}

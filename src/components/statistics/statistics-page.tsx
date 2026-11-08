"use client";
import Link from "next/link";
import {useState,useTransition} from "react";
import {ArrowLeft,ArrowUpRight,BarChart3,ChevronLeft,ChevronRight,Flame,Languages,Moon,Sprout,Sun} from "lucide-react";
import {usePreferences} from "@/lib/preferences";
import {statisticsCopy} from "@/lib/statistics/copy";
import {adjacentDate,clockDuration,sumDays,type StudyStatistics,type StatisticsTrack,type StatisticsView} from "@/lib/statistics/model";
import {loadStatisticsTracks} from "@/lib/statistics/actions";
import TimeChart from "./time-chart";
type Props={data:StudyStatistics;view:StatisticsView;date:string;trackId:string;choices:{tracks:StatisticsTrack[];count:number;page:number};selectedTrack:StatisticsTrack|null;ownerId:string};
export default function StatisticsPage({data,view,date,trackId,choices,selectedTrack,ownerId}:Props){
 const {locale,theme,updatePreferences}=usePreferences();const t=statisticsCopy[locale],totals=sumDays(data.days);
 const dayCount=(count:number)=>`${count} ${locale==="en"&&count===1?"day":t.days}`;
 const [options,setOptions]=useState(selectedTrack&&!choices.tracks.some(x=>x.id===selectedTrack.id)?[selectedTrack,...choices.tracks]:choices.tracks);
 const [loaded,setLoaded]=useState(choices.tracks.length),[page,setPage]=useState(0),[pending,startTransition]=useTransition(),[error,setError]=useState(false);
 const href=(nextView:StatisticsView,nextDate:string)=>"/statistics?"+new URLSearchParams({view:nextView,[nextView==="month"?"month":"date"]:nextView==="month"?nextDate.slice(0,7):nextDate,...(trackId?{track:trackId}:{})}).toString();
 function more(){setError(false);startTransition(async()=>{try{const result=await loadStatisticsTracks(page+1,ownerId);if(!result){setError(true);return;}setOptions(old=>[...old,...result.tracks.filter(x=>!old.some(y=>y.id===x.id))]);setLoaded(n=>n+result.tracks.length);setPage(result.page);}catch{setError(true);}});}
 const rangeLabel=new Intl.DateTimeFormat(locale==="th"?"th-TH":"en-GB",{day:view==="month"?undefined:"numeric",month:"long",year:"numeric",timeZone:"UTC"});
 return <div className="tracks-page statistics-page"><header className="tracks-header"><Link className="account-brand" href="/"><span className="brand-mark"><Sprout size={25}/></span><span>Focus<span className="brand-accent">Exam</span></span></Link><div className="tracks-toolbar"><button className="account-tool" onClick={()=>updatePreferences({locale:locale==="th"?"en":"th"})} aria-label="Language"><Languages size={17}/>{locale==="th"?"EN":"ไทย"}</button><button className="account-tool" onClick={()=>updatePreferences({theme:theme==="light"?"dark":"light"})} aria-label={theme==="light"?"Dark theme":"Light theme"}>{theme==="light"?<Moon size={18}/>:<Sun size={18}/>}</button></div></header>
 <main className="tracks-main"><Link href="/" className="account-back"><ArrowLeft size={16}/>{t.back}</Link>
 <div className="tracks-heading"><div><div className="eyebrow"><BarChart3 size={15}/>FOCUS / INSIGHTS</div><h1>{t.title}</h1><p>{t.intro}</p></div><Link href="/history" className="track-secondary">{t.history}<ArrowUpRight size={16}/></Link></div>
 <section className="statistics-controls card"><nav className="statistics-tabs" aria-label={t.period}>{(["day","week","month"] as const).map(value=><Link href={href(value,date)} key={value} aria-current={view===value?"page":undefined}>{t[value]}</Link>)}</nav>
 <form action="/statistics" className="statistics-form"><input type="hidden" name="view" value={view}/>
 <label>{view==="month"?t.monthInput:t.date}<input required type={view==="month"?"month":"date"} name={view==="month"?"month":"date"} defaultValue={view==="month"?date.slice(0,7):date} min={view==="month"?"1900-01":"1900-01-01"} max={view==="month"?"9998-12":"9998-12-31"}/></label>
 <label>{t.track}<select name="track" defaultValue={trackId}><option value="">{t.all}</option>{options.map(track=><option key={track.id} value={track.id}>{track.name}{track.archived_at?` · ${t.archived}`:""}</option>)}</select></label>
 <button className="track-primary" type="submit">{t.apply}</button>
 </form>{loaded<choices.count&&<button className="text-button statistics-more" type="button" disabled={pending} onClick={more}>{pending?t.loading:t.more} ({loaded}/{choices.count})</button>}{error&&<p role="alert">{t.loadError}</p>}
 <p className="statistics-scope">{t.scope}</p></section>
 <section className="insights-summary" aria-label={t.title}>{[[t.study,clockDuration(totals.study)],[t.rest,clockDuration(totals.rest)],[t.active,dayCount(totals.active)]].map(([label,value])=><article className="card" key={label}><p>{label}</p><strong>{value}</strong><small>{data.from} — {data.to}</small></article>)}</section>
 <section className="statistics-chart-card card"><div className="statistics-period"><Link className="account-tool" href={href(view,adjacentDate(view,date,-1))} aria-label={t.previous}><ChevronLeft size={20}/></Link><div><h2>{rangeLabel.format(new Date(date+"T12:00:00Z"))}</h2><p>{data.from} — {data.to}</p></div><Link className="account-tool" href={href(view,adjacentDate(view,date,1))} aria-label={t.next}><ChevronRight size={20}/></Link><Link href={href(view,data.today)} className="text-button">{t.today}</Link></div>
 {totals.study+totals.rest===0&&<div className="statistics-empty"><BarChart3 size={28}/><h3>{t.empty}</h3><p>{t.emptyNote}</p></div>}
 <TimeChart days={data.days} locale={locale}/></section>
 <section className="statistics-streak card"><span className="stat-icon mint"><Flame size={24}/></span><div><p>{t.streak} · {t.accountStreak}</p><strong>{dayCount(data.current_streak)}</strong></div><div><p>{t.longest}</p><strong>{dayCount(data.longest_streak)}</strong></div></section>
 {data.streak_minimum_seconds===600&&<p className="statistics-timezone">{t.streakRule}</p>}
 <p className="statistics-timezone">{t.timezone} · {data.timezone}<br/>{t.snapshot}</p>
 {data.unallocated_sessions>0&&<aside className="statistics-legacy card"><h2>{t.legacy} · {data.unallocated_sessions}</h2><strong>{clockDuration(data.unallocated_seconds)}</strong><p>{t.legacyNote}</p><Link href="/history">{t.history}<ArrowUpRight size={15}/></Link></aside>}
 </main></div>;
}


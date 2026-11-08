"use client";
import Link from "next/link";
import {ArrowLeft,ChevronLeft,ChevronRight,Languages,Moon,RefreshCw,Sprout,Sun,Target} from "lucide-react";
import {useRouter} from "next/navigation";
import {usePreferences} from "@/lib/preferences";
import {goalsCopy} from "@/lib/goals/copy";
import {shiftDate} from "@/lib/statistics/model";
import type {GoalDay} from "@/lib/goals/model";
import type {TimerTrackPage} from "@/lib/sessions/types";
import GoalCollection from "./goal-collection";
import {useGoalRefresh} from "./use-goal-refresh";
export default function GoalsManager({data,choices,ownerId,followsToday}:{data:GoalDay;choices:TimerTrackPage;ownerId:string;followsToday:boolean}){
 const {locale,theme,updatePreferences}=usePreferences(),router=useRouter(),t=goalsCopy[locale];
 useGoalRefresh(data.summary.timezone,data.summary.today);
 const date=data.summary.date;
 const href=(day:string,page=1)=>"/goals?"+new URLSearchParams({date:day,page:String(page)});
 const pageHref=(page:number)=>followsToday?"/goals?page="+page:href(date,page);
 const dateLabel=new Intl.DateTimeFormat(locale==="th"?"th-TH":"en-GB",{day:"numeric",month:"long",year:"numeric",timeZone:"UTC"}).format(new Date(date+"T12:00:00Z"));
 return <div className="tracks-page goals-page"><header className="tracks-header"><Link className="account-brand" href="/"><span className="brand-mark"><Sprout size={25}/></span><span>Focus<span className="brand-accent">Exam</span></span></Link><div className="tracks-toolbar"><button className="account-tool" onClick={()=>updatePreferences({locale:locale==="th"?"en":"th"})} aria-label="Language"><Languages size={17}/>{locale==="th"?"EN":"ไทย"}</button><button className="account-tool" onClick={()=>updatePreferences({theme:theme==="light"?"dark":"light"})} aria-label={theme==="light"?"Dark theme":"Light theme"}>{theme==="light"?<Moon size={18}/>:<Sun size={18}/>}</button></div></header>
 <main className="tracks-main"><Link href="/" className="account-back"><ArrowLeft size={16}/>{t.back}</Link><div className="tracks-heading"><div><div className="eyebrow"><Target size={15}/>FOCUS / DAILY PLAN</div><h1>{t.title}</h1><p>{t.intro}</p></div><button className="track-secondary" onClick={()=>router.refresh()}><RefreshCw size={16}/>{t.refresh}</button></div>
 <section className="goals-date-panel card"><div className="goals-date-nav">{date>"1900-01-01"?<Link className="account-tool" href={href(shiftDate(date,-1))} aria-label={t.previous}><ChevronLeft size={20}/></Link>:<span/>}<div><h2>{dateLabel}</h2><p>{t.timezone} · {data.summary.timezone}</p></div>{date<"9998-12-31"?<Link className="account-tool" href={href(shiftDate(date,1))} aria-label={t.next}><ChevronRight size={20}/></Link>:<span/>}<Link href="/goals" className="track-secondary">{t.today}</Link></div>
 <form action="/goals" className="goals-date-form"><label>{t.date}<input type="date" name="date" defaultValue={date} required min="1900-01-01" max="9998-12-31"/></label><button className="track-secondary">{t.show}</button></form><p className="goals-date-note">{t.history}</p></section>
 <GoalCollection data={data} ownerId={ownerId} choices={choices} locale={locale}/>
 {data.pages>1&&<nav className="tracks-pagination" aria-label={t.page}>{data.page>1?<Link href={pageHref(data.page-1)}><ChevronLeft size={16}/>{t.previousPage}</Link>:<span/>}<span>{data.page} / {data.pages}</span>{data.page<data.pages?<Link href={pageHref(data.page+1)}>{t.nextPage}<ChevronRight size={16}/></Link>:<span/>}</nav>}
 <p className="goals-date-note goals-history-note">{t.dayNote}</p></main></div>;
}


"use client";
import Link from "next/link";
import {ArrowUpRight,AudioLines,Sparkles,Sprout} from "lucide-react";
import TimeChart from "@/components/statistics/time-chart";
import {copy,type Locale} from "@/lib/copy";
import {statisticsCopy} from "@/lib/statistics/copy";
import {stats} from "@/lib/demo";
import {clockDuration,type StudyStatistics} from "@/lib/statistics/model";
export default function StatisticsOverview({statistics,locale}:{statistics:StudyStatistics|null;locale:Locale}){
 const t=copy[locale],insight=statisticsCopy[locale];
 const duration=(seconds:number)=>`${Math.floor(seconds/3600)} ${t.hour}${seconds%3600?` ${Math.floor(seconds%3600/60)} ${t.minute}`:""}`;
 return statistics?<section className="weekly-card card"><div className="compact-heading"><h3>{insight.weekly}</h3><AudioLines size={18}/></div><div className="week-total">{clockDuration(statistics.days.reduce((sum,day)=>sum+day.study_seconds,0))}</div><TimeChart days={statistics.days} locale={locale} compact/><Link href="/statistics?view=month" className="statistics-explore">{insight.view}<ArrowUpRight size={15}/></Link>{statistics.unallocated_sessions>0&&<p className="statistics-brief-legacy">{insight.legacy} · {statistics.unallocated_sessions}</p>}</section>
 :<section className="weekly-card card"><div className="compact-heading"><h3>{t.weekly}</h3><span className="tiny-icon"><AudioLines size={17}/></span></div><p className="drawer-demo-note">{t.sampleStats}</p><p className="muted">{t.week}</p><div className="week-total">{duration(stats.weeklySeconds.reduce((a,b)=>a+b,0))}<span><Sprout size={14}/>{t.quoteBy}</span></div><div className="bar-chart" role="img" aria-label={`${t.weeklyLabel}: ${stats.weeklySeconds.map((s,i)=>`${t.weekdays[i]} ${s/60}`).join(", ")}`}><div className="chart-guides"><span>180</span><span>90</span><span>0</span></div><div className="bars">{stats.weeklySeconds.map((seconds,i)=><div className={`bar-column ${i===6?"current":""}`} key={i}><div className="bar-area"><div className="bar" style={{height:`${seconds/10800*100}%`}}/></div><span>{t.weekdays[i]}</span></div>)}</div></div><p className="week-note"><Sparkles size={13}/>{t.weekNote}</p><Link href="/login" className="statistics-explore">{locale==="th"?"เข้าสู่ระบบเพื่อดูสถิติของคุณ":"Sign in to see your statistics"}<ArrowUpRight size={15}/></Link></section>;
}


"use client";

import { ArrowUpRight, AudioLines, BookOpen, Check, ChevronRight, Clock3, Coffee, Flame, FlaskConical, Headphones, Languages, Leaf, Moon, Plus, Sparkles, Sprout, Sun, Target, Timer, X } from "lucide-react";
import Link from "next/link";
import DashboardTracks from "@/components/tracks/dashboard-tracks";
import type { PersonalTrack } from "@/lib/tracks/model";
import type { TimerTrackPage } from "@/lib/sessions/types";
import { copy } from "@/lib/copy";
import { usePreferences } from "@/lib/preferences";
import { authCopy } from "@/lib/auth/copy";
import type { AccountSummary } from "@/lib/auth/types";
import AccountControl from "@/components/auth/account-control";
import { goals, stats, tracks } from "@/lib/demo";
import FocusTimer from "@/components/focus-timer";
import { statisticsCopy } from "@/lib/statistics/copy";
import { clockDuration, type StudyStatistics } from "@/lib/statistics/model";
import type { GoalDay } from "@/lib/goals/model";
import DashboardGoals from "@/components/goals/dashboard-goals";
import DashboardUtilities from "@/components/dashboard/dashboard-utilities";
import {openDashboardPanel} from "@/components/dashboard/utility-events";
import type { StreakStatus } from "@/lib/streak/model";

function Garden() {
  return <svg className="garden" viewBox="0 0 520 210" preserveAspectRatio="none" fill="none" aria-hidden="true">
    <path d="M0 171C80 109 155 127 231 153C331 188 405 95 520 136V210H0Z" fill="var(--hill-back)" />
    <path d="M0 191C100 146 187 193 280 162C395 120 460 165 520 173V210H0Z" fill="var(--hill-front)" />
    <path d="M306 161V100M306 128C276 127 272 103 276 92C300 91 309 108 306 128ZM307 145C336 140 347 120 340 108C320 108 308 124 307 145Z" stroke="var(--plant)" strokeWidth="4" fill="var(--plant-fill)" strokeLinecap="round" />
    <path d="M358 177V149M358 164C343 163 341 151 343 145C355 144 360 154 358 164ZM359 170C372 167 377 158 374 152C364 152 359 161 359 170Z" stroke="var(--plant)" strokeWidth="3" fill="var(--plant-fill)" />
    <path d="M54 71H96M75 50V91M185 42H201M193 34V50" stroke="var(--plant)" strokeWidth="2" strokeLinecap="round" opacity=".35" />
    <path d="M438 96q7-9 14 0q7-9 14 0M144 92q5-6 10 0q5-6 10 0" stroke="var(--plant)" strokeWidth="2" strokeLinecap="round" />
    <ellipse cx="104" cy="183" rx="34" ry="7" fill="var(--plant)" opacity=".1" />
    <path d="M82 155H125L120 181H87Z" fill="var(--pot)" /><path d="M103 154V123M103 143C82 141 80 124 84 117C101 117 106 132 103 143ZM104 134C120 132 127 118 122 112C109 114 103 124 104 134Z" fill="var(--plant-fill)" stroke="var(--plant)" strokeWidth="3" />
  </svg>;
}

export default function Dashboard({ account, personalTracks, timerOwnerId, timerTrackChoices, statistics, goalDay, streakStatus }: { account: AccountSummary | null; personalTracks: PersonalTrack[]; timerOwnerId: string; timerTrackChoices: TimerTrackPage; statistics: StudyStatistics | null; goalDay: GoalDay | null; streakStatus: StreakStatus | null }) {
  const { locale, theme, updatePreferences } = usePreferences();
  const t = copy[locale];
  const insight = statisticsCopy[locale];
  const todayStudy = statistics?.today_study_seconds ?? stats.studySeconds;
  const todayBreak = statistics?.today_break_seconds ?? stats.breakSeconds;
  const streak = streakStatus?.current_streak ?? statistics?.current_streak ?? stats.streakDays;
  const duration = (seconds: number) => `${Math.floor(seconds / 3600)} ${t.hour}${seconds % 3600 ? ` ${Math.floor(seconds % 3600 / 60)} ${t.minute}` : ""}`;
  return <>
    <a className="skip-link" href="#main">{t.skip}</a>
    <aside className="sidebar">
      <a className="brand" href="#main" aria-label="FocusExam"><span className="brand-mark"><Sprout size={26} /></span><span>Focus<span className="brand-accent">Exam</span><small>YOUR LITTLE SPACE TO GROW</small></span></a>
      <div className="nav-label">{t.overview}</div>
      <nav aria-label={t.overview}>
        <a className="nav-item active" href="#main"><Timer size={19} />{t.dashboard}<span className="nav-dot" /></a>
        <Link className="nav-item" href={account ? "/tracks" : "#tracks"}><BookOpen size={19} />{t.tracks}</Link>
        <Link className="nav-item" href={account ? "/statistics" : "/login"}><AudioLines size={19} />{locale === "th" ? "สถิติ" : "Statistics"}</Link>
        <Link className="nav-item" href={account ? "/goals" : "#goals"}><Target size={19} />{t.goals}</Link>
        <button className="nav-item nav-panel-button" type="button" onClick={()=>openDashboardPanel("sound")}><Headphones size={19} />{t.music}</button>
        <Link className="nav-item" href={account ? "/cosmetics" : "/login?next=/cosmetics"}><Sparkles size={19} />{locale === "th" ? "ของตกแต่ง" : "Decorations"}</Link>
      </nav>
      <div className="sidebar-garden"><Sprout size={44} strokeWidth={1.3} /><p>{t.smallSteps}</p><span>{t.tagline}</span><i /><i /><i /></div>
      <div className="sidebar-bottom"><span className="avatar"><Leaf size={19} /></span><div><strong>{account?.displayName ?? authCopy[locale].guest}</strong><small>{account ? authCopy[locale][account.role] : t.demo}</small></div><span className="status-dot" /></div>
    </aside>
    <div className="workspace">
      <header className="topbar"><span className="breadcrumb">FocusExam <ChevronRight size={14} /><span>{t.dashboard}</span></span><div className="toolbar"><span className="demo-pill"><span />{statistics ? insight.saved : t.sampleStats}</span><button className="language-button" onClick={() => updatePreferences({ locale: locale === "th" ? "en" : "th" })} aria-label={t.language}><Languages size={17} /><span>{locale === "th" ? "EN" : "ไทย"}</span></button><button className="icon-button" onClick={() => updatePreferences({ theme: theme === "light" ? "dark" : "light" })} aria-label={theme === "light" ? t.dark : t.light}>{theme === "light" ? <Moon size={19} /> : <Sun size={19} />}</button><AccountControl account={account} locale={locale} /></div></header>
      <main id="main">
        <section className="greeting"><div><div className="eyebrow"><Sparkles size={14} />{t.tagline}</div><h1>{t.welcome}<span className="hello-spark">✦</span></h1><p>{t.intro}</p></div><div className="gentle-badge"><Leaf size={16} />{t.quoteBy}</div></section>
        <div className="demo-notice"><span className="notice-icon">i</span>{account ? insight.saved : t.demoNote}</div>
        <section className="stats-grid" aria-label={`${t.today} · ${statistics ? insight.saved : t.sample}`}>
          <article className="stat-card"><span className="stat-icon mint"><Clock3 size={22} /></span><div><p>{t.focus}<span>{t.today}</span></p><strong>{statistics ? clockDuration(todayStudy) : duration(todayStudy)}</strong></div><span className="stat-decoration">↗</span></article>
          <article className="stat-card"><span className="stat-icon blue"><Coffee size={22} /></span><div><p>{t.break}<span>{t.today}</span></p><strong>{statistics ? clockDuration(todayBreak) : <>{todayBreak / 60} <small>{t.minute}</small></>}</strong></div><span className="stat-decoration"><Leaf size={21} /></span></article>
          <article className="stat-card"><span className="stat-icon peach"><Flame size={22} /></span><div><p>{t.streak}</p><strong>{streak} <small>{t.days}</small><span className="streak-spark"> ✦</span></strong></div><span className="streak-caption">{t.smallSteps}</span></article>
        </section>
        <div className="dashboard-grid">
          <div className="primary-column">
            <FocusTimer key={timerOwnerId} locale={locale} ownerId={timerOwnerId} choices={timerTrackChoices} streakStatus={streakStatus}><Garden /></FocusTimer>
          </div>
          <div className="secondary-column">
            {goalDay ? <DashboardGoals data={goalDay} ownerId={timerOwnerId} choices={timerTrackChoices}/> : <section id="goals" className="goals-card card"><div className="compact-heading"><h2><Target size={18} />{t.goals}</h2><span className="count-pill">1 / 3</span></div><p className="muted">{t.goalNote}</p><div className="goal-list">{goals.map(goal => <div className={`goal ${goal.complete ? "complete" : ""}`} key={goal.id}><span className="goal-checkbox" aria-label={goal.complete ? t.completed : undefined}>{goal.complete && <Check size={13} />}</span><span>{goal.title[locale]}</span></div>)}</div><div className="goals-progress"><span>{t.sample} · 1/3 {t.completed}</span><span>33%</span></div><div className="progress-track mint" role="progressbar" aria-label={t.goalProgress} aria-valuenow={33} aria-valuemin={0} aria-valuemax={100}><span style={{ width: "33.33%" }} /></div><button disabled className="add-goal" title={t.demoHelp}><Plus size={15} />{t.addGoal}<span>{t.soon}</span></button></section>}
          </div>
        </div>
        <div className="dashboard-tracks-below">
            {account ? <DashboardTracks tracks={personalTracks} locale={locale} /> : <section id="tracks" className="tracks-section"><div className="section-heading"><div><h2><BookOpen size={19} />{t.tracks}</h2><p>{t.trackNote}</p></div><button disabled className="text-button" title={t.demoHelp}>{t.viewTracks}<ArrowUpRight size={15} /></button></div><div className="track-grid">{tracks.map(track => { const Icon = track.icon === "math" ? X : track.icon === "language" ? Languages : FlaskConical; return <article className="track-card card" key={track.id}><div className="track-top"><span className={`track-icon ${track.color}`}><Icon size={22} /></span><span className="sample-label">{t.sample}</span></div><h3>{track.name[locale]}</h3><p>{track.detail[locale]}</p><div className="track-duration"><small>{t.total}</small><strong>{duration(track.totalSeconds)}</strong></div><div className={`progress-track ${track.color}`} role="progressbar" aria-label={`${track.name[locale]} — ${t.progress}`} aria-valuenow={track.progress} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${track.progress}%` }} /></div></article>; })}</div><button disabled className="add-track" title={t.demoHelp}><Plus size={17} />{t.addTrack}<span>{t.soon}</span></button></section>}
        </div>
        <div className="quote"><Sprout size={23} /><p>“{t.quote}”</p><span>{t.quoteBy}</span></div>
        <footer><span><Leaf size={13} />FocusExam</span><p>{t.footer}</p><span>{statistics ? insight.saved : t.demo}</span></footer>
      </main>
    </div>
    <DashboardUtilities statistics={statistics}/>
  </>;
}

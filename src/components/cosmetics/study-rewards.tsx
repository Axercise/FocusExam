"use client";
import { useEffect, useRef, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Coins, Gift, RefreshCw } from "lucide-react";
import { usePreferences } from "@/lib/preferences";
import { clockDuration } from "@/lib/statistics/model";
import type { StudyRewards } from "@/lib/cosmetics/rewards-model";

export default function StudyRewardsPanel({ data }: { data: StudyRewards }) {
  const { locale } = usePreferences(), th = locale === "th";
  const router = useRouter(), lastRefresh = useRef(0);
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== "visible" || Date.now() - lastRefresh.current < 1000) return;
      lastRefresh.current = Date.now();
      router.refresh();
    };
    const delay = Math.max(1000, Date.parse(data.next_midnight_at) - Date.parse(data.server_now) + 500);
    const timer = window.setTimeout(refresh, Math.min(delay, 2147483647));
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => { clearTimeout(timer); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, [router, data.next_midnight_at, data.server_now]);
  const date = new Intl.DateTimeFormat(th ? "th-TH" : "en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${data.today}T12:00:00Z`));
  return <section id="study-rewards" className="study-rewards" aria-labelledby="study-rewards-title">
    <div className="study-rewards-heading"><div><span className="account-eyebrow">FOCUS / EARN</span><h2 id="study-rewards-title"><Gift size={21} />{th ? "เรียนรู้แล้วรับเหรียญ" : "Focus, grow, collect"}</h2><p>{th ? "เวลาโฟกัสที่เซฟแล้ว นับตามวันที่เรียนจริง · รับเหรียญอัตโนมัติ" : "Saved focus time, credited to the day you studied · Coins arrive automatically"}</p></div><button type="button" className="track-secondary rewards-refresh" disabled={pending} onClick={() => startTransition(() => router.refresh())} aria-label={th ? "อัปเดตรางวัล" : "Refresh rewards"}><RefreshCw size={16} />{th ? "อัปเดต" : "Refresh"}</button></div>
    <div className="daily-quest-heading"><div><h3>Daily Quest <span>{date}</span></h3><p>{th ? "รับสะสมทั้ง 4 ขั้นได้ 65 Coin/วัน · เวลาพักไม่นับ" : "All four milestones add up to 65 Coin/day · Breaks are excluded"}</p></div><strong>{clockDuration(data.study_seconds)}</strong></div>
    <div className="daily-quest-grid">{data.quests.map(quest => <article className={`daily-quest-card${quest.awarded ? " is-earned" : ""}`} key={quest.minutes}><span>{quest.awarded ? <Check size={18} /> : <Coins size={18} />}{quest.coins} Coin</span><h4>{th ? `โฟกัส ${quest.minutes} นาที` : `Focus ${quest.minutes} min`}</h4><progress max={quest.required_seconds} value={Math.min(data.study_seconds, quest.required_seconds)} aria-label={th ? `ความคืบหน้าโฟกัส ${quest.minutes} นาที` : `Progress toward ${quest.minutes} focused minutes`} /><p>{quest.awarded ? th ? "ได้รับแล้ว" : "Collected" : `${clockDuration(Math.min(data.study_seconds, quest.required_seconds))} / ${clockDuration(quest.required_seconds)}`}</p></article>)}</div>
    <div className="track-rewards-heading"><h3>{th ? "รางวัลประจำ Track" : "Track milestones"}</h3><p>{th ? "ทุก 10 ชั่วโมง รับ 50 Coin · แต่ละวิชาสะสมแยกกัน" : "Every 10 hours earns 50 Coin · Each subject grows separately"}</p></div>
    {data.tracks.length ? <div className="track-rewards-grid">{data.tracks.map(track => <article className="track-reward-card" key={track.track_id}><div><Link href={`/tracks/${track.track_id}`}>{track.name}<ArrowRight size={14} /></Link>{track.archived && <small>{th ? "เก็บไว้แล้ว" : "Archived"}</small>}<span>{th ? `รับแล้ว ${track.milestones * 50} Coin` : `${track.milestones * 50} Coin collected`}</span></div><progress value={track.study_seconds % 36000} max={36000} aria-label={`${track.name} · ${th ? "รางวัล 10 ชั่วโมงรอบถัดไป" : "Next 10-hour milestone"}`} /><p>{th ? `อีก ${clockDuration(track.seconds_to_next)} รับ 50 Coin รอบถัดไป` : `${clockDuration(track.seconds_to_next)} to your next 50 Coin`}</p></article>)}</div> : <Link className="cosmetic-track-link" href="/tracks">{th ? "สร้าง Track แรกแล้วเริ่มสะสมเวลา →" : "Create your first Track and start growing →"}</Link>}
    {data.pages > 1 && <nav className="rewards-pagination" aria-label={th ? "หน้ารางวัล Track" : "Track reward pages"}>{data.page > 1 ? <Link href={`/cosmetics?rewardPage=${data.page - 1}#study-rewards`}>{th ? "ก่อนหน้า" : "Previous"}</Link> : <span /> }<span>{data.page} / {data.pages}</span>{data.page < data.pages ? <Link href={`/cosmetics?rewardPage=${data.page + 1}#study-rewards`}>{th ? "ถัดไป" : "Next"}</Link> : <span />}</nav>}
  </section>;
}

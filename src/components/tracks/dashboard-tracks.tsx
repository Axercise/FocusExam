import Link from "next/link";
import { ArrowUpRight, BookOpen, Plus, Sprout } from "lucide-react";
import { tracksCopy } from "@/lib/tracks/copy";
import type { PersonalTrack } from "@/lib/tracks/model";
import type { Locale } from "@/lib/copy";
import TrackIcon from "./track-icon";
import { formatElapsed } from "@/lib/timer/model";
import { sessionCopy } from "@/lib/sessions/copy";

export default function DashboardTracks({ tracks, locale }: { tracks: PersonalTrack[]; locale: Locale }) {
  const t = tracksCopy[locale];
  return <section id="tracks" className="tracks-section">
    <div className="section-heading"><div><h2><BookOpen size={19} />{t.title}</h2><p>{t.latest}</p></div><Link className="text-button" href="/tracks">{t.manage}<ArrowUpRight size={15} /></Link></div>
    {tracks.length ? <div className="dashboard-personal-tracks">{tracks.map(track => <Link className={`dashboard-personal-track track-bg-${track.background}`} href={`/tracks/${track.id}`} key={track.id} data-track-color={track.color}><span className={`personal-track-icon track-color-${track.color}`}><TrackIcon name={track.icon} size={21} /></span><h3>{track.name}</h3><p>{track.description || t.noDescription}</p><span className="dashboard-saved-time"><small>{sessionCopy[locale].total}</small><b>{formatElapsed(track.total_seconds)}</b></span></Link>)}</div> : <div className="dashboard-tracks-empty"><Sprout size={30} strokeWidth={1.4} /><h3>{t.emptyTitle}</h3><p>{t.emptyNote}</p></div>}
    <Link className="add-track" href="/tracks"><Plus size={16} />{tracks.length ? t.add : t.first}<ArrowUpRight size={14} /></Link>
    <Link className="study-history-link" href="/history">{sessionCopy[locale].history}<ArrowUpRight size={14} /></Link>
  </section>;
}

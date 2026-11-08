"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";
import { Check, RefreshCw, Save } from "lucide-react";
import { timerCommandAction, loadTimerTracksAction } from "@/lib/sessions/actions";
import { sessionCopy } from "@/lib/sessions/copy";
import type { SessionResult, TimerTrackPage } from "@/lib/sessions/types";
import type { TimerCommand, TimerState } from "@/lib/timer/model";
import type { Locale } from "@/lib/copy";

export default function SessionSavePanel({ state, locale, ownerId, choices, dispatch }: {
  state: TimerState; locale: Locale; ownerId: string; choices: TimerTrackPage; dispatch: (action: TimerCommand) => void;
}) {
  const t = sessionCopy[locale];
  const router = useRouter();
  const [tracks, setTracks] = useState(choices);
  const [trackId, setTrackId] = useState("");
  const [recap, setRecap] = useState("");
  const [loading, startLoading] = useTransition();
  const [loadFailed, setLoadFailed] = useState(false);
  const [result, action, saving] = useActionState<SessionResult, FormData>(async (_previous, form) => {
    const saved = await timerCommandAction({ clientId: state.sessionId!, operation: "save",
      trackId: state.mode === "break" ? undefined : String(form.get("trackId") ?? ""), recap: String(form.get("recap") ?? ""),
      expectedOwnerId: ownerId }).catch(() => ({ message: "unavailable" as const }));
    if ("snapshot" in saved && saved.snapshot?.saved_session_id) {
      dispatch({ type: "saved", sessionId: saved.snapshot.client_id,
        savedSessionId: saved.snapshot.saved_session_id, trackName: saved.snapshot.saved_track_name });
      router.refresh();
    }
    return saved;
  }, {});
  function load(more: boolean) {
    startLoading(async () => {
      const next = await loadTimerTracksAction(more ? tracks.page + 1 : 0, ownerId).catch(() => null);
      if (!next) { setLoadFailed(true); return; }
      setLoadFailed(false);
      setTracks(more ? { ...next, tracks: [...tracks.tracks, ...next.tracks].filter((item,index,list) => list.findIndex(other => other.id === item.id) === index) } : next);
      if (!more) setTrackId("");
    });
  }
  if (state.savedSessionId) return <div className="session-saved" role="status"><Check size={20} /><div><strong>{state.mode === "break" ? t.savedBreak : `${t.saved} ${state.savedTrackName ?? ""}`}</strong><Link href="/history">{t.history}</Link></div></div>;
  if (ownerId === "guest") return <div className="session-save-note"><p>{t.guest}</p><Link href="/login">{t.login}</Link></div>;
  if (!state.serverRunId) return <p className="session-save-note">{t.legacy}</p>;
  return <section className="session-save-panel" aria-labelledby="session-save-title"><h3 id="session-save-title"><Save size={17} />{t.title}</h3>
    <form action={action}>
      {state.mode !== "break" ? <><label htmlFor="session-track">{t.track}</label><select id="session-track" name="trackId" value={trackId} onChange={event => setTrackId(event.target.value)} required disabled={saving}><option value="">{t.choose}</option>{tracks.tracks.map(track => <option value={track.id} key={track.id}>{track.name}</option>)}</select>
      {!tracks.count && <p>{t.noTracks}</p>}<div className="session-track-tools"><Link href="/tracks">{t.manage}</Link><button type="button" disabled={loading || saving} onClick={() => load(false)}><RefreshCw size={13} />{t.refresh}</button></div>
      {tracks.tracks.length < tracks.count && <button className="session-load-more" type="button" disabled={loading || saving} onClick={() => load(true)}>{t.more}</button>}</> : <p>{t.breakNote}</p>}
      <label htmlFor="session-recap">{t.recap}</label><textarea id="session-recap" name="recap" rows={3} value={recap} onChange={event => setRecap(event.target.value)} disabled={saving} aria-describedby="session-recap-help" /><p id="session-recap-help">{t.recapNote}</p>
      {(result.message && result.message !== "saved" || loadFailed) && <p className="session-error" role="alert">{t.messages[loadFailed ? "unavailable" : result.message!]}</p>}
      <button className="session-save-button" disabled={saving || loading || (state.mode !== "break" && !trackId)}><Save size={16} />{saving ? t.saving : state.mode === "break" ? t.saveBreak : t.save}</button>
    </form>
  </section>;
}

"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode, type CSSProperties } from "react";
import { Check, Coffee, Infinity as InfinityIcon, Pause, Play, RotateCcw, SkipForward, Sprout, Square, Volume2, VolumeX } from "lucide-react";
import { type Locale } from "@/lib/copy";
import { timerCopy } from "@/lib/timer/copy";
import { durationMs, elapsedMs, formatElapsed, formatTimer, remainingSeconds, type TimerMode } from "@/lib/timer/model";
import { timerCompletedEvent, useTimer } from "@/lib/timer/store";
import TimerFullscreen from "./timer-fullscreen";
import SessionSavePanel from "./session-save-panel";
import { sessionCopy } from "@/lib/sessions/copy";
import type { TimerTrackPage } from "@/lib/sessions/types";
import TimerAmbientButton from "./ambient/timer-ambient-button";
import {getAlarmVolume,duckAmbient} from "@/lib/ambient/store";
import type { StreakStatus } from "@/lib/streak/model";
import StreakMonitor from "./streak/streak-monitor";

function DurationSettings({ durationSeconds, mode, locale, pending, onDuration }: {
  durationSeconds: number; mode: TimerMode; locale: Locale; pending: boolean; onDuration: (minutes: number, seconds: number) => void;
}) {
  const t = timerCopy[locale];
  const [minutes, setMinutes] = useState(String(Math.floor(durationSeconds / 60)));
  const [seconds, setSeconds] = useState(String(durationSeconds % 60));
  const [invalid, setInvalid] = useState(false);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const m = Number(minutes), s = Number(seconds), total = m * 60 + s;
    if (!/^\d{1,3}$/.test(minutes) || !/^\d{1,2}$/.test(seconds) || !Number.isInteger(m) || !Number.isInteger(s) ||
      m < 0 || s < 0 || s > 59 || total < 1 || total > 10800) { setInvalid(true); return; }
    setInvalid(false); onDuration(m,s);
  }
  return <div className="timer-duration-settings">
    <div className="timer-presets" aria-label={t.presets}>{(mode === "focus" ? [25,50,90] : [5,10,15]).map(preset => <button type="button" key={preset} disabled={pending} aria-pressed={durationSeconds === preset * 60} onClick={() => onDuration(preset,0)}>{preset} {t.minutes}</button>)}</div>
    <details className="timer-custom"><summary>{t.settings}</summary><form onSubmit={submit} noValidate>
      <div className="timer-time-fields"><label htmlFor="timer-minutes">{t.minutes}<input id="timer-minutes" name="minutes" type="number" inputMode="numeric" min={0} max={180} step={1} value={minutes} onChange={event => { setMinutes(event.target.value); setInvalid(false); }} disabled={pending} aria-invalid={invalid} aria-describedby="timer-duration-help" /></label><span>:</span><label htmlFor="timer-seconds">{t.seconds}<input id="timer-seconds" name="seconds" type="number" inputMode="numeric" min={0} max={59} step={1} value={seconds} onChange={event => { setSeconds(event.target.value); setInvalid(false); }} disabled={pending} aria-invalid={invalid} aria-describedby="timer-duration-help" /></label><button type="submit" disabled={pending}><Check size={14} />{t.apply}</button></div>
      <p id="timer-duration-help" className={invalid ? "timer-field-error" : ""}>{invalid ? t.invalidDuration : t.durationHelp}</p>
    </form></details>
  </div>;
}

function ConfirmReset({ locale, onCancel, onConfirm }: { locale: Locale; onCancel: () => void; onConfirm: () => void }) {
  const t = timerCopy[locale];
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close(); }, []);
  return <dialog ref={dialog} className="timer-reset-dialog" aria-labelledby="timer-reset-title" aria-describedby="timer-reset-note" onClose={onCancel}>
    <RotateCcw size={27} /><h2 id="timer-reset-title">{t.resetTitle}</h2><p id="timer-reset-note">{t.resetNote}</p>
    <div><button className="timer-dialog-cancel" type="button" onClick={() => dialog.current?.close()}>{t.cancel}</button><button className="timer-dialog-confirm" type="button" onClick={() => { dialog.current?.close(); onConfirm(); }}>{t.confirmReset}</button></div>
  </dialog>;
}

export default function FocusTimer({ locale, ownerId, children, choices, streakStatus }: { locale: Locale; ownerId: string; children: ReactNode; choices: TimerTrackPage; streakStatus: StreakStatus | null }) {
  const { state, now, durable, pending, error, dispatch, storageKey } = useTimer(ownerId);
  const t = timerCopy[locale];
  const [confirmReset, setConfirmReset] = useState<"reset" | "next" | null>(null);
  const audio = useRef<AudioContext | null>(null);
  const primaryButton = useRef<HTMLButtonElement>(null);
  const completed = state.status === "completed";
  const active = state.status === "running" || state.status === "paused";
  const spent = elapsedMs(state, now);
  const lockin = state.mode === "lockin";
  const seconds = lockin ? Math.floor(spent / 1000) : completed ? 0 : remainingSeconds(state, now);
  const display = lockin ? formatElapsed(seconds) : formatTimer(seconds);
  const target = durationMs(state);
  const modeName = lockin ? t.lockin : state.mode === "focus" ? t.focus : t.break;
  const status = state.status === "running" ? state.mode === "break" ? t.resting : lockin ? t.lockedIn : t.running
    : state.status === "paused" ? t.paused : completed ? t.completed : t.idle;

  async function prepareSound(force = false) {
    if (!state.soundEnabled && !force) return;
    try {
      if (!audio.current && window.AudioContext) audio.current = new AudioContext();
      if (audio.current?.state === "suspended") await audio.current.resume();
    } catch { /* The visible completion notice works without audio permission. */ }
  }
  useEffect(() => {
    const chime = (event: Event) => {
      if ((event as CustomEvent<{ key: string }>).detail?.key !== storageKey || !state.soundEnabled) return;
      const context = audio.current;
      if (!context || context.state !== "running") return;
      const alertVolume=getAlarmVolume();
      if(alertVolume===0)return;
      duckAmbient();
      try {
        [0, 0.23].forEach(offset => {
          const oscillator = context.createOscillator(), gain = context.createGain();
          const at = context.currentTime + offset;
          oscillator.type = "sine"; oscillator.frequency.value = offset ? 880 : 660;
          gain.gain.setValueAtTime(0, at); gain.gain.linearRampToValueAtTime(0.1*alertVolume, at + 0.02); gain.gain.exponentialRampToValueAtTime(0.001*alertVolume, at + 0.2);
          oscillator.connect(gain); gain.connect(context.destination);
          oscillator.start(at); oscillator.stop(at + 0.21);
          oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
        });
      } catch { /* Audio is best-effort; never interrupt timer completion. */ }
    };
    window.addEventListener(timerCompletedEvent, chime);
    return () => window.removeEventListener(timerCompletedEvent, chime);
  }, [storageKey, state.soundEnabled]);
  useEffect(() => () => { void audio.current?.close().catch(() => {}); }, []);
  useEffect(() => {
    const original = document.title;
    if (state.status !== "idle") document.title = `${completed ? "✓ " : ""}${display} · ${status} · FocusExam`;
    return () => { document.title = original; };
  }, [completed, display, state.status, status]);

  function reset(action: "reset" | "next" = "reset") {
    if ((active || completed) && spent >= 1000 && !state.savedSessionId) setConfirmReset(action);
    else dispatch({ type: action });
  }
  return <TimerFullscreen locale={locale} label={modeName} toolbar={<><TimerAmbientButton locale={locale}/><button className="timer-sound-button" type="button" aria-pressed={state.soundEnabled} aria-disabled={pending} aria-label={state.soundEnabled ? t.soundOff : t.soundOn} title={t.soundHelp} onClick={() => { if (pending) return; if (!state.soundEnabled) void prepareSound(true); dispatch({ type: "sound", enabled: !state.soundEnabled }); }}>{state.soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}</button></>}>
    <h2 id="focus-title">{lockin ? t.lockinTitle : state.mode === "focus" ? t.ready : t.breakTitle}</h2>
    <p>{lockin ? t.lockinNote : state.mode === "focus" ? t.readyNote : t.breakNote}</p>
    <div className="mode-switch timer-modes" aria-label={locale === "th" ? "โหมดจับเวลา" : "Timer mode"}>
      <button type="button" className={state.mode === "focus" ? "selected" : ""} aria-pressed={state.mode === "focus"} disabled={state.status !== "idle" || pending} onClick={() => dispatch({ type: "mode", mode: "focus" })}><Sprout size={14} />{t.focus}</button>
      <button type="button" className={state.mode === "break" ? "selected" : ""} aria-pressed={state.mode === "break"} disabled={state.status !== "idle" || pending} onClick={() => dispatch({ type: "mode", mode: "break" })}><Coffee size={14} />{t.break}</button>
      <button type="button" className={lockin ? "selected" : ""} aria-pressed={lockin} disabled={state.status !== "idle" || pending} onClick={() => dispatch({ type: "mode", mode: "lockin" })}><InfinityIcon size={14} />{t.lockin}</button>
    </div>
    <div className={`timer-display${lockin ? " timer-stopwatch" : seconds >= 6000 ? " timer-wide" : ""}`} style={{ "--timer-digits": display.length } as CSSProperties} role="timer" aria-live="off" aria-label={`${modeName} ${display}`}>{display.split(":").map((part,index) => <span className="timer-number-part" key={index}>{index > 0 && <span className="timer-colon">:</span>}{part}</span>)}</div>
    <p className="timer-status-text" aria-live="polite">{status}</p>
    {lockin ? <p className="timer-lockin-note"><InfinityIcon size={15} />{t.noLimit}</p> : <div className="timer-progress" role="progressbar" aria-label={t.currentRound} aria-valuemin={0} aria-valuemax={target / 1000} aria-valuenow={Math.floor(spent / 1000)}><span style={{ width: `${spent / target * 100}%` }} /></div>}
    {completed ? <div className="timer-completion" role="status"><Sprout size={21} /><strong>{state.mode === "break" ? t.completedBreak : t.completedFocus}</strong><p>{t.elapsed} <b>{formatElapsed(Math.floor(state.elapsedMs / 1000))}</b></p></div> : null}
    {completed && <SessionSavePanel key={state.sessionId} state={state} locale={locale} ownerId={ownerId} choices={choices} dispatch={dispatch} />}
    {error && <p className="timer-command-error" role="alert">{sessionCopy[locale].messages[error]}</p>}
    <div className="timer-main-controls">
      {completed ? <button className="start-button" type="button" aria-disabled={pending} onClick={() => { if (!pending) reset(lockin ? "reset" : "next"); }}><SkipForward size={17} />{lockin ? t.newLockin : state.mode === "focus" ? t.nextBreak : t.nextFocus}</button>
        : <button ref={primaryButton} className="start-button" type="button" disabled={!now} aria-disabled={pending} onClick={() => { if (pending) return; if (state.status === "running") dispatch({ type: "pause" }); else { void prepareSound(); dispatch({ type: "start" }); } }}>{state.status === "running" ? <Pause size={17} /> : <Play size={17} fill="currentColor" />}{state.status === "running" ? t.pause : state.status === "paused" ? t.resume : lockin ? t.startLockin : state.mode === "focus" ? t.start : t.startBreak}</button>}
      {active && <button className="timer-finish" type="button" disabled={pending || spent < 1000} onClick={() => { primaryButton.current?.focus(); dispatch({ type: "finish" }); }}><Square size={14} />{lockin ? t.finishSave : t.finish}</button>}
    </div>
    {state.status !== "idle" && !(completed && lockin) && <button className="timer-reset" type="button" disabled={pending} onClick={() => reset()}><RotateCcw size={14} />{completed ? t.nextRound : t.reset}</button>}
    {state.status === "idle" && !lockin && <DurationSettings key={`${state.mode}-${target}`} durationSeconds={target / 1000} mode={state.mode} locale={locale} pending={pending} onDuration={(minutes,seconds) => { primaryButton.current?.focus(); dispatch({ type: "duration", minutes, seconds }); }} />}
    {!durable && <p className="timer-storage-notice" role="status">{t.storageNote}</p>}
    {!completed && <p className="timer-local-note">{ownerId === "guest" ? sessionCopy[locale].guest : active && !state.serverRunId ? sessionCopy[locale].legacy : t.saveNote}</p>}
    {active && <p className="timer-background-note">{t.keepPage}</p>}
    {children}
    <StreakMonitor ownerId={ownerId} locale={locale} initialStatus={streakStatus} timer={state}/>
    {confirmReset && <ConfirmReset locale={locale} onCancel={() => setConfirmReset(null)} onConfirm={() => { primaryButton.current?.focus(); dispatch({ type: confirmReset }); }} />}
  </TimerFullscreen>;
}

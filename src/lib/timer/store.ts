"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore, useTransition } from "react";
import { decodeTimer, durationMs, elapsedMs, fromServerTimer, transitionTimer, type TimerCommand } from "./model";
import { timerCommandAction } from "@/lib/sessions/actions";
import type { SessionMessage } from "@/lib/sessions/types";

const changeEvent = "focusexam-timer-change";
export const timerCompletedEvent = "focusexam-timer-completed";
const memory = new Map<string, string>();
const volatile = new Set<string>();
const errors = new Map<string, SessionMessage>();
const retryAt = new Map<string, number>();
const syncing = new Set<string>();
export function timerStorageKey(ownerId: string) { return `focusexam-timer:v1:${ownerId}`; }
function read(key: string) {
  if (volatile.has(key)) return memory.get(key) ?? "";
  try { return window.localStorage.getItem(key) ?? ""; }
  catch { volatile.add(key); return memory.get(key) ?? ""; }
}
function write(key: string, raw: string) {
  memory.set(key, raw);
  try { window.localStorage.setItem(key, raw); volatile.delete(key); }
  catch { volatile.add(key); }
  window.dispatchEvent(new CustomEvent(changeEvent, { detail: key }));
}
function newId() {
  if (typeof globalThis.crypto?.randomUUID === "function") return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, ch => {
    const n = Math.floor(Math.random() * 16); return (ch === "x" ? n : (n & 3) | 8).toString(16);
  });
}
async function command(key: string, action: TimerCommand, authenticated: boolean) {
  let applied = false;
  const apply = async () => {
    applied = true;
    const before = decodeTimer(read(key));
    const id = before.sessionId ?? newId();
    let next = transitionTimer(before, action, Date.now(), id);
    let operation: string | null = null;
    if (authenticated) {
      if (action.type === "start" && before.status === "idle") operation = "start";
      else if (before.serverRunId) {
        if (action.type === "start" && before.status === "paused") operation = "resume";
        else if (action.type === "pause" && before.status === "running") operation = "pause";
        else if (action.type === "finish" && ["running","paused"].includes(before.status)) operation = "finish";
        else if (action.type === "sync" && before.status === "running") operation = "sync";
        else if (["reset","next"].includes(action.type) && !before.savedSessionId) operation = "discard";
      }
    }
    if (operation) {
      const result = await timerCommandAction({ clientId: id, operation, mode: before.mode,
        durationSeconds: before.mode === "lockin" ? undefined : durationMs(before) / 1000,
        expectedOwnerId: key.slice("focusexam-timer:v1:".length) }).catch(() => ({ message: "unavailable" as const }));
      if (!("snapshot" in result) || !result.snapshot) {
        errors.set(key, result.message ?? "unavailable"); retryAt.set(key, Date.now() + 5000);
        window.dispatchEvent(new CustomEvent(changeEvent, { detail: key })); return;
      }
      if (operation !== "discard") next = fromServerTimer(result.snapshot, before, Date.now());
    } else if (before.serverRunId && before.status === "running" && next.status === "completed" && action.type === "sound") {
      next = { ...before, soundEnabled: action.enabled };
    }
    errors.delete(key);
    const raw = JSON.stringify(next);
    if (raw !== JSON.stringify(before)) {
      write(key, raw);
      if (next.status === "completed" && before.status !== "completed") {
        window.dispatchEvent(new CustomEvent(timerCompletedEvent, { detail: { key, sessionId: next.sessionId } }));
      }
    } else window.dispatchEvent(new CustomEvent(changeEvent, { detail: key }));
  };
  if (navigator.locks?.request) {
    try { await navigator.locks.request(key, apply); }
    catch (error) { if (!applied) await apply(); else throw error; }
  } else await apply();
}

let clock = 0;
let interval: ReturnType<typeof setInterval> | undefined;
const clockListeners = new Set<() => void>();
function tick() { clock = Date.now(); clockListeners.forEach(listener => listener()); }
function subscribeClock(listener: () => void) {
  clockListeners.add(listener);
  if (clockListeners.size === 1) {
    tick();
    interval = setInterval(tick, 200);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("pageshow", tick);
  }
  return () => {
    clockListeners.delete(listener);
    if (!clockListeners.size) {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("pageshow", tick);
    }
  };
}
const snapshotClock = () => clock;
const serverClock = () => 0;
const emptySnapshot = () => "";
const serverDurable = () => true;
const serverError = () => undefined;

export function useTimer(ownerId: string) {
  const key = timerStorageKey(ownerId);
  const subscribe = useCallback((listener: () => void) => {
    const changed = (event: Event) => {
      if (event instanceof StorageEvent) {
        if (event.key === key || event.key === null) listener();
      } else if ((event as CustomEvent<string>).detail === key) listener();
    };
    window.addEventListener("storage", changed);
    window.addEventListener(changeEvent, changed);
    return () => { window.removeEventListener("storage", changed); window.removeEventListener(changeEvent, changed); };
  }, [key]);
  const snapshot = useCallback(() => read(key), [key]);
  const persistence = useCallback(() => !volatile.has(key), [key]);
  const errorSnapshot = useCallback(() => errors.get(key), [key]);
  const error = useSyncExternalStore(subscribe, errorSnapshot, serverError);
  const raw = useSyncExternalStore(subscribe, snapshot, emptySnapshot);
  const durable = useSyncExternalStore(subscribe, persistence, serverDurable);
  const state = useMemo(() => decodeTimer(raw), [raw]);
  const now = useSyncExternalStore(subscribeClock, snapshotClock, serverClock);
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    if (state.mode !== "lockin" && state.status === "running" && elapsedMs(state, now) >= durationMs(state) &&
      !syncing.has(key) && now >= (retryAt.get(key) ?? 0)) {
      syncing.add(key);
      void command(key, { type: "sync" }, ownerId !== "guest").finally(() => syncing.delete(key));
    }
  }, [key, now, ownerId, state]);
  const dispatch = (action: TimerCommand) => startTransition(async () => { await command(key, action, ownerId !== "guest"); });
  return { state, now, durable, pending, error, dispatch, storageKey: key };
}

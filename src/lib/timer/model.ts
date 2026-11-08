export type TimerMode = "focus" | "break" | "lockin";
export type TimerStatus = "idle" | "running" | "paused" | "completed";
export type TimerState = {
  version: 1;
  mode: TimerMode;
  status: TimerStatus;
  focusSeconds: number;
  breakSeconds: number;
  elapsedMs: number;
  startedAt: number | null;
  completedAt: number | null;
  sessionId: string | null;
  soundEnabled: boolean;
  serverRunId: string | null;
  savedSessionId: string | null;
  savedTrackName: string | null;
};
export type TimerCommand =
  | { type: "start" | "pause" | "finish" | "reset" | "sync" | "next" }
  | { type: "mode"; mode: TimerMode }
  | { type: "duration"; minutes: number; seconds?: number }
  | { type: "sound"; enabled: boolean }
  | { type: "saved"; sessionId: string; savedSessionId: string; trackName: string | null };

export function initialTimer(): TimerState {
  return { version: 1, mode: "focus", status: "idle", focusSeconds: 1500, breakSeconds: 300,
    elapsedMs: 0, startedAt: null, completedAt: null, sessionId: null, soundEnabled: true,
    serverRunId: null, savedSessionId: null, savedTrackName: null };
}
export function durationMs(state: TimerState) {
  return state.mode === "lockin" ? Infinity : (state.mode === "focus" ? state.focusSeconds : state.breakSeconds) * 1000;
}
export function elapsedMs(state: TimerState, now: number) {
  const active = state.status === "running" && state.startedAt !== null ? Math.max(0, now - state.startedAt) : 0;
  return Math.min(durationMs(state), state.elapsedMs + active);
}
export function remainingSeconds(state: TimerState, now: number) {
  return Math.max(0, Math.ceil((durationMs(state) - elapsedMs(state, now)) / 1000));
}
export function formatTimer(seconds: number) {
  const whole = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(whole / 60)).padStart(2, "0")}:${String(whole % 60).padStart(2, "0")}`;
}
export function formatElapsed(seconds: number) {
  const whole = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(whole / 3600)).padStart(2,"0")}:${String(Math.floor(whole % 3600 / 60)).padStart(2,"0")}:${String(whole % 60).padStart(2,"0")}`;
}
function reset(state: TimerState): TimerState {
  return { ...state, status: "idle", elapsedMs: 0, startedAt: null, completedAt: null, sessionId: null,
    serverRunId: null, savedSessionId: null, savedTrackName: null };
}
function synchronize(state: TimerState, now: number): TimerState {
  if (state.status !== "running" || state.startedAt === null || elapsedMs(state, now) < durationMs(state)) return state;
  return { ...state, status: "completed", elapsedMs: durationMs(state), startedAt: null,
    completedAt: state.startedAt + durationMs(state) - state.elapsedMs };
}
export function transitionTimer(current: TimerState, command: TimerCommand, now: number, newSessionId: string): TimerState {
  const state = synchronize(current, now);
  switch (command.type) {
    case "sync": return state;
    case "sound": return { ...state, soundEnabled: command.enabled };
    case "mode": return state.status === "idle" ? { ...state, mode: command.mode } : state;
    case "duration": {
      const seconds = command.seconds ?? 0;
      const total = command.minutes * 60 + seconds;
      if (state.status !== "idle" || state.mode === "lockin" || !Number.isInteger(command.minutes) || command.minutes < 0 ||
        !Number.isInteger(seconds) || seconds < 0 || seconds > 59 || total < 1 || total > 10800) return state;
      return { ...state, [state.mode === "focus" ? "focusSeconds" : "breakSeconds"]: total };
    }
    case "saved":
      return state.status === "completed" && state.sessionId === command.sessionId
        ? { ...state, savedSessionId: command.savedSessionId, savedTrackName: command.trackName } : state;
    case "start":
      if (state.status !== "idle" && state.status !== "paused") return state;
      return { ...state, status: "running", startedAt: now, sessionId: state.sessionId ?? newSessionId };
    case "pause":
      return state.status === "running" ? { ...state, status: "paused", elapsedMs: elapsedMs(state, now), startedAt: null } : state;
    case "finish":
      if (!["running", "paused"].includes(state.status) || elapsedMs(state, now) < 1000) return state;
      return { ...state, status: "completed", elapsedMs: elapsedMs(state, now), startedAt: null, completedAt: now };
    case "reset": return reset(state);
    case "next":
      return state.status === "completed" ? { ...reset(state), mode: state.mode === "break" ? "focus" : "break" } : state;
  }
}

/** Treat stored timer data as untrusted and discard malformed/inconsistent state. */
export function decodeTimer(raw: string): TimerState {
  if (!raw || raw.length > 2500) return initialTimer();
  try {
    const decoded = JSON.parse(raw);
    const state = { serverRunId: null, savedSessionId: null, savedTrackName: null, ...decoded } as TimerState;
    const validDuration = (value: number) => Number.isInteger(value) && value >= 1 && value <= 10800;
    const validTime = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 8640000000000000;
    if (!state || state.version !== 1 || !["focus", "break", "lockin"].includes(state.mode) ||
      !["idle", "running", "paused", "completed"].includes(state.status) ||
      !validDuration(state.focusSeconds) || !validDuration(state.breakSeconds) ||
      !Number.isSafeInteger(state.elapsedMs) || state.elapsedMs < 0 || state.elapsedMs > durationMs(state) ||
      typeof state.soundEnabled !== "boolean") return initialTimer();
    if (state.status === "idle") {
      if (state.elapsedMs !== 0 || state.startedAt !== null || state.completedAt !== null || state.sessionId !== null) return initialTimer();
    } else {
      if (typeof state.sessionId !== "string" || !state.sessionId || state.sessionId.length > 100) return initialTimer();
      if (state.status === "running" ? !validTime(state.startedAt) : state.startedAt !== null) return initialTimer();
      if (state.status === "completed" ? !validTime(state.completedAt) : state.completedAt !== null) return initialTimer();
    }
    // Explicit fields keep unknown stored properties out of subsequent writes.
    return { version: 1, mode: state.mode, status: state.status, focusSeconds: state.focusSeconds,
      breakSeconds: state.breakSeconds, elapsedMs: state.elapsedMs, startedAt: state.startedAt,
      completedAt: state.completedAt, sessionId: state.sessionId, soundEnabled: state.soundEnabled,
      serverRunId: typeof state.serverRunId === "string" ? state.serverRunId : null,
      savedSessionId: typeof state.savedSessionId === "string" ? state.savedSessionId : null,
      savedTrackName: typeof state.savedTrackName === "string" ? state.savedTrackName.slice(0,80) : null };
  } catch { return initialTimer(); }
}

export type ServerTimerSnapshot = {
  id: string; client_id: string; mode: TimerMode; duration_seconds: number | null;
  status: "running" | "paused" | "completed" | "saved" | "discarded";
  elapsed_ms: number; started_at: string; ended_at: string | null; server_now: string;
  saved_session_id: string | null; saved_track_name: string | null;
};
export function fromServerTimer(snapshot: ServerTimerSnapshot, preferences: TimerState, now: number): TimerState {
  if (snapshot.status === "discarded") return reset({ ...preferences, mode: snapshot.mode });
  return { ...preferences, mode: snapshot.mode, status: snapshot.status === "saved" ? "completed" : snapshot.status,
    focusSeconds: snapshot.mode === "focus" ? snapshot.duration_seconds! : preferences.focusSeconds,
    breakSeconds: snapshot.mode === "break" ? snapshot.duration_seconds! : preferences.breakSeconds,
    elapsedMs: snapshot.elapsed_ms, startedAt: snapshot.status === "running" ? now : null,
    completedAt: snapshot.ended_at ? Date.parse(snapshot.ended_at) : null,
    sessionId: snapshot.client_id, serverRunId: snapshot.id,
    savedSessionId: snapshot.saved_session_id, savedTrackName: snapshot.saved_track_name };
}

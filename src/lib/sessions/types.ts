import type { ServerTimerSnapshot } from "@/lib/timer/model";
export type SessionMessage = "saved" | "auth_required" | "unavailable" | "timer_not_found" | "timer_not_completed" | "timer_too_short" | "track_unavailable" | "invalid_recap" | "invalid_request";
export type SessionResult = { message?: SessionMessage; snapshot?: ServerTimerSnapshot };
export type TimerTrackChoice = { id: string; name: string };
export type TimerTrackPage = { tracks: TimerTrackChoice[]; count: number; page: number };

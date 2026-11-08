"use server";

import { revalidatePath } from "next/cache";
import { createMutableClient } from "@/lib/supabase/server";
import { isTrackId } from "@/lib/tracks/model";
import type { TimerMode, ServerTimerSnapshot } from "@/lib/timer/model";
import type { SessionMessage, SessionResult, TimerTrackPage } from "./types";

export async function timerCommandAction(input: {
  clientId: string; operation: string; mode?: TimerMode; durationSeconds?: number; trackId?: string; recap?: string; expectedOwnerId?: string;
}): Promise<SessionResult> {
  if (!input || typeof input !== "object" || !isTrackId(input.clientId) || !["start","pause","resume","finish","discard","sync","save"].includes(input.operation)) return { message: "invalid_request" };
  if (input.trackId !== undefined && (typeof input.trackId !== "string" || !isTrackId(input.trackId))) return { message: "track_unavailable" };
  if (input.recap !== undefined && (typeof input.recap !== "string" || [...input.recap].length > 2000)) return { message: "invalid_recap" };
  const supabase = await createMutableClient();
  const identity = await supabase.auth.getUser().catch(() => null);
  if (!identity?.data.user || identity.error) return { message: "auth_required" };
  if (input.expectedOwnerId && identity.data.user.id !== input.expectedOwnerId) return { message: "auth_required" };
  const result = await supabase.rpc("timer_command", {
    p_client_id: input.clientId, p_operation: input.operation, p_mode: input.mode,
    p_duration_seconds: input.durationSeconds, p_track_id: input.trackId, p_recap: input.recap?.trim(),
  }).abortSignal(AbortSignal.timeout(12000));
  if (result.error) {
    const known: SessionMessage[] = ["timer_not_found","timer_not_completed","timer_too_short","track_unavailable","invalid_recap"];
    return { message: known.includes(result.error.message as SessionMessage) ? result.error.message as SessionMessage : "unavailable" };
  }
  if (input.operation === "save") { revalidatePath("/"); revalidatePath("/cosmetics"); revalidatePath("/tracks"); if(input.trackId) revalidatePath(`/tracks/${input.trackId}`); revalidatePath("/history"); revalidatePath("/statistics"); }
  return { snapshot: result.data as unknown as ServerTimerSnapshot, message: input.operation === "save" ? "saved" : undefined };
}

export async function loadTimerTracksAction(page: number, expectedOwnerId?: string): Promise<TimerTrackPage | null> {
  if (!Number.isSafeInteger(page) || page < 0 || page > 100000) return null;
  const supabase = await createMutableClient();
  const identity = await supabase.auth.getUser().catch(() => null);
  if (!identity?.data.user || identity.error) return null;
  if (expectedOwnerId && identity.data.user.id !== expectedOwnerId) return null;
  const result = await supabase.from("tracks").select("id,name", { count: "exact" })
    .eq("user_id", identity.data.user.id).is("archived_at", null)
    .order("created_at", { ascending: false }).order("id", { ascending: false }).range(page * 25, page * 25 + 24);
  return result.error ? null : { tracks: result.data, count: result.count ?? 0, page };
}

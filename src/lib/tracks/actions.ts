"use server";

import { revalidatePath } from "next/cache";
import { createMutableClient } from "@/lib/supabase/server";
import { isTrackId, validateTrackFields, type TrackActionState } from "./model";

function refreshTracks() { revalidatePath("/tracks"); revalidatePath("/tracks/[trackId]","page"); revalidatePath("/"); revalidatePath("/goals"); }

export async function saveTrackAction(_previous: TrackActionState, form: FormData): Promise<TrackActionState> {
  const parsed = validateTrackFields(form);
  if (parsed.error) return { message: parsed.error };
  const rawId = form.get("trackId");
  if (rawId !== null && typeof rawId !== "string") return { message: "not_found" };
  const id = typeof rawId === "string" ? rawId : "";
  if (id && !isTrackId(id)) return { message: "not_found" };
  const supabase = await createMutableClient();
  const identity = await supabase.auth.getUser().catch(() => null);
  if (identity?.error || !identity?.data.user) return { message: "auth_required" };
  const userId = identity.data.user.id;
  const query = id
    ? supabase.from("tracks").update(parsed.values).eq("id", id).eq("user_id", userId).is("archived_at", null)
    : supabase.from("tracks").insert({ ...parsed.values, user_id: userId });
  const result = await query.select("id").single();
  if (result.error) return { message: result.error.code === "PGRST116" ? "not_found" : "unavailable" };
  refreshTracks();
  return { message: id ? "saved" : "created", success: true };
}

export async function archiveTrackAction(_previous: TrackActionState, form: FormData): Promise<TrackActionState> {
  const id = form.get("trackId"), operation = form.get("operation");
  if (typeof id !== "string" || !isTrackId(id) || !["archive", "restore"].includes(String(operation))) return { message: "not_found" };
  const supabase = await createMutableClient();
  const identity = await supabase.auth.getUser().catch(() => null);
  if (identity?.error || !identity?.data.user) return { message: "auth_required" };
  let query = supabase.from("tracks").update({ archived_at: operation === "archive" ? new Date().toISOString() : null })
    .eq("id", id).eq("user_id", identity.data.user.id);
  query = operation === "archive" ? query.is("archived_at", null) : query.not("archived_at", "is", null);
  const result = await query.select("id").single();
  if (result.error) return { message: result.error.code === "PGRST116" ? "not_found" : "unavailable" };
  refreshTracks();
  return { message: operation === "archive" ? "archived" : "restored", success: true };
}

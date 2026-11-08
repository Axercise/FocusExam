import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { TimerTrackPage } from "./types";

export async function getTimerTrackChoices(userId: string): Promise<TimerTrackPage> {
  const supabase = await createClient();
  const result = await supabase.from("tracks").select("id,name", { count: "exact" }).eq("user_id", userId).is("archived_at", null)
    .order("created_at", { ascending: false }).order("id", { ascending: false }).range(0,24);
  if (result.error) throw new Error("Unable to load your study subjects.");
  return { tracks: result.data, count: result.count ?? 0, page: 0 };
}

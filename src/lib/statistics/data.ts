import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { StudyStatistics } from "./model";
import { getStreakStatus } from "@/lib/streak/data";
export async function getStatistics(from?: string,to?: string,trackId?: string) {
  const streak = await getStreakStatus();
  const supabase=await createClient();
  const {data,error}=await supabase.rpc("study_statistics",{p_from:from,p_to:to,p_track_id:trackId});
  if (error) throw new Error("Unable to load your statistics.");
  const statistics = data as unknown as StudyStatistics;
  return streak ? { ...statistics, current_streak: streak.current_streak, longest_streak: streak.longest_streak, streak_minimum_seconds: 600 } : statistics;
}
export async function getStatisticsTracks(userId:string,page=0) {
  const supabase=await createClient();
  const {data,error,count}=await supabase.from("tracks").select("id,name,archived_at",{count:"exact"})
    .eq("user_id",userId).order("created_at",{ascending:false}).order("id",{ascending:false}).range(page*25,page*25+24);
  if(error) throw new Error("Unable to load your Track filters.");
  return {tracks:data,count:count??0,page};
}


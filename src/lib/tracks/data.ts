import "server-only";

import { createClient } from "@/lib/supabase/server";
import { isTrackColor, isTrackIcon, TRACK_PAGE_SIZE, type PersonalTrack, type TrackView } from "./model";
import type {TrackDetailData} from "./detail-model";

const columns = "id,name,description,color,icon,background,archived_at,created_at" as const;
function present(row: Omit<PersonalTrack, "color" | "icon" | "total_seconds"> & { color: string; icon: string }, total = 0): PersonalTrack {
  return { ...row, color: isTrackColor(row.color) ? row.color : "mint", icon: isTrackIcon(row.icon) ? row.icon : "book", total_seconds: total };
}
async function totals(ids: string[]) {
  if (!ids.length) return new Map<string,number>();
  const supabase = await createClient();
  const result = await supabase.rpc("track_study_totals", { p_track_ids: ids });
  if (result.error) throw new Error("Unable to load saved study time.");
  return new Map(result.data.map(row => [row.track_id,Number(row.total_seconds)]));
}

export async function getDashboardTracks(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("tracks").select(columns).eq("user_id", userId)
    .is("archived_at", null).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(3);
  if (error) throw new Error("Unable to load your tracks.");
  const saved = await totals(data.map(row => row.id));
  return data.map(row => present(row,saved.get(row.id) ?? 0));
}

export async function getTrackList(userId: string, view: TrackView, requestedPage: number) {
  const supabase = await createClient();
  const [active, archived] = await Promise.all([
    supabase.from("tracks").select("id", { count: "exact", head: true }).eq("user_id", userId).is("archived_at", null),
    supabase.from("tracks").select("id", { count: "exact", head: true }).eq("user_id", userId).not("archived_at", "is", null),
  ]);
  if (active.error || archived.error) throw new Error("Unable to load your track counts.");
  const activeCount = active.count ?? 0, archivedCount = archived.count ?? 0;
  const pages = Math.max(1, Math.ceil((view === "active" ? activeCount : archivedCount) / TRACK_PAGE_SIZE));
  const page = Math.min(requestedPage, pages);
  let query = supabase.from("tracks").select(columns).eq("user_id", userId);
  query = view === "active" ? query.is("archived_at", null) : query.not("archived_at", "is", null);
  const result = await query.order("created_at", { ascending: false }).order("id", { ascending: false })
    .range((page - 1) * TRACK_PAGE_SIZE, page * TRACK_PAGE_SIZE - 1);
  if (result.error) throw new Error("Unable to load your tracks.");
  const saved = await totals(result.data.map(row => row.id));
  return { tracks: result.data.map(row => present(row,saved.get(row.id) ?? 0)), activeCount, archivedCount, page, pages, view };
}
export type TrackListData = Awaited<ReturnType<typeof getTrackList>>;

export async function getOwnedTrack(userId:string,id:string){
 const supabase=await createClient();
 const result=await supabase.from("tracks").select(columns).eq("user_id",userId).eq("id",id).maybeSingle();
 if(result.error)throw new Error("Unable to load your Track.");
 return result.data?present(result.data):null;
}
export async function getTrackDetailStatistics(id:string,from?:string,to?:string,page=1,all=false){
 const supabase=await createClient();
 const result=await supabase.rpc("track_detail_statistics",{p_track_id:id,p_from:from,p_to:to,p_page:page,p_all_history:all}).abortSignal(AbortSignal.timeout(12000));
 if(result.error)throw new Error("Unable to load subject statistics.");
 return result.data as unknown as TrackDetailData;
}

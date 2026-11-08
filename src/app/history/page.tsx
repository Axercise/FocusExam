import { redirect } from "next/navigation";
import { getCurrentAccount } from "@/lib/auth/account";
import { createClient } from "@/lib/supabase/server";
import { parseTrackPage } from "@/lib/tracks/model";
import StudyHistory from "@/components/study-history";

export const dynamic = "force-dynamic";
export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const account = await getCurrentAccount();
  if (!account) redirect("/login");
  const supabase = await createClient();
  const count = await supabase.from("study_sessions").select("id",{count:"exact",head:true}).eq("user_id",account.user.id);
  if (count.error) throw new Error("Unable to load your study history.");
  const pages = Math.max(1,Math.ceil((count.count ?? 0)/12));
  const requested = parseTrackPage((await searchParams).page), page = Math.min(requested,pages);
  if (requested !== page) redirect(`/history?page=${page}`);
  const result = await supabase.from("study_sessions").select("id,mode,duration_seconds,recap,ended_at,timezone,allocation_status,tracks(name)")
    .eq("user_id",account.user.id).order("ended_at",{ascending:false}).order("id",{ascending:false}).range((page-1)*12,page*12-1);
  if (result.error) throw new Error("Unable to load your saved sessions.");
  return <StudyHistory sessions={result.data} page={page} pages={pages} timezone={account.profile.timezone} />;
}

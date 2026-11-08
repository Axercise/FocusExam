import "server-only";
import {createClient} from "@/lib/supabase/server";
import type {GoalSummary,GoalDay} from "./model";
export async function getGoalDay(userId:string,date?:string,requestedPage=1,preview=false):Promise<GoalDay>{
 const supabase=await createClient();
 const result=await supabase.rpc("goal_day_summary",{p_date:date});
 if(result.error)throw new Error("Unable to load your daily goals.");
 const summary=result.data as unknown as GoalSummary;
 const pages=Math.max(1,Math.ceil(summary.total/12)),page=Math.min(requestedPage,pages);
 const goals=await supabase.from("daily_goals").select("id,goal_date,timezone,title,track_id,completed_at,revision,created_at,tracks(name,archived_at)")
 .eq("user_id",userId).eq("goal_date",summary.date).order("created_at",{ascending:true}).order("id",{ascending:true})
 .range(preview?0:(page-1)*12,preview?4:page*12-1);
 if(goals.error)throw new Error("Unable to load your goal list.");
 return {summary,goals:goals.data,page,pages};
}


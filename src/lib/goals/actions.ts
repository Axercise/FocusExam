"use server";
import {revalidatePath} from "next/cache";
import {createMutableClient} from "@/lib/supabase/server";
import {isTrackId} from "@/lib/tracks/model";
import {validDate} from "@/lib/statistics/model";
import {validGoalTitle,validRevision,type GoalActionState} from "./model";
export async function goalAction(_previous:GoalActionState,form:FormData):Promise<GoalActionState>{
 const field=(key:string)=>typeof form.get(key)==="string"?String(form.get(key)):"";
 const operation=field("operation"),id=field("goalId"),date=field("date"),owner=field("ownerId");
 const revision=validRevision(form.get("revision"));
 if(!["create","edit","complete","delete"].includes(operation)||!isTrackId(id)||!validDate(date)||!isTrackId(owner)||operation!=="create"&&revision===null)return {message:"invalid_request"};
 const title=field("title").trim(),track=field("trackId");
 if((operation==="create"||operation==="edit")&&!validGoalTitle(title))return {message:"invalid_title"};
 if((operation==="create"||operation==="edit")&&track&&!isTrackId(track))return {message:"track_unavailable"};
 const done=field("done");
 if(operation==="complete"&&!["true","false"].includes(done))return {message:"invalid_request"};
 const supabase=await createMutableClient();
 const identity=await supabase.auth.getUser().catch(()=>null);
 if(identity?.error||identity?.data.user?.id!==owner)return {message:"auth_required"};
 const values={title,track_id:track||null};
 const query=operation==="create"?supabase.from("daily_goals").insert({...values,id,user_id:owner,goal_date:date})
 :operation==="delete"?supabase.from("daily_goals").delete().eq("id",id).eq("user_id",owner).eq("goal_date",date).eq("revision",revision!)
 :supabase.from("daily_goals").update(operation==="edit"?values:{completed_at:done==="true"?new Date().toISOString():null})
 .eq("id",id).eq("user_id",owner).eq("goal_date",date).eq("revision",revision!);
 const result=await query.select("id").abortSignal(AbortSignal.timeout(12000)).maybeSingle();
 if(result.error)return {message:result.error.message.includes("goal_track_unavailable")?"track_unavailable":result.error.code==="23505"?"conflict":"unavailable"};
 if(!result.data)return {message:"conflict"};
 revalidatePath("/");revalidatePath("/goals");
 return {success:true,message:operation==="create"?"created":operation==="edit"?"saved":operation==="delete"?"deleted":done==="true"?"completed":"reopened"};
}


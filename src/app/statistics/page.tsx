import { redirect } from "next/navigation";
import { getCurrentAccount } from "@/lib/auth/account";
import { createClient } from "@/lib/supabase/server";
import { isTrackId } from "@/lib/tracks/model";
import { getStatistics,getStatisticsTracks } from "@/lib/statistics/data";
import { statisticsRange,validDate,type StatisticsView } from "@/lib/statistics/model";
import StatisticsPage from "@/components/statistics/statistics-page";
export const dynamic="force-dynamic";
export default async function Page({searchParams}:{searchParams:Promise<{view?:string;date?:string;month?:string;track?:string}>}) {
 const account=await getCurrentAccount(); if(!account) redirect("/login");
 const params=await searchParams;
 const view:StatisticsView=params.view==="day"||params.view==="month"?params.view:"week";
 const [initial,choices]=await Promise.all([getStatistics(),getStatisticsTracks(account.user.id)]);
 let trackId=typeof params.track==="string"&&isTrackId(params.track)?params.track:undefined;
 let selectedTrack=null;
 if(trackId){
   const supabase=await createClient();
   const result=await supabase.from("tracks").select("id,name,archived_at").eq("user_id",account.user.id).eq("id",trackId).maybeSingle();
   if(result.error) throw new Error("Unable to verify Track filter.");
   if(result.data) selectedTrack=result.data; else trackId=undefined;
 }
 const candidate=view==="month"&&typeof params.month==="string"?params.month+"-01":params.date;
 const date=validDate(candidate)?candidate:initial.today;
 const range=statisticsRange(view,date);
 const data=range.from===initial.from&&range.to===initial.to&&!trackId?initial:await getStatistics(range.from,range.to,trackId);
 return <StatisticsPage key={[view,date,trackId].join(":")} data={data} view={view} date={date} trackId={trackId??""}
   choices={choices} selectedTrack={selectedTrack} ownerId={account.user.id}/>;
}


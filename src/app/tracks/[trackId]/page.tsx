import {notFound,redirect} from "next/navigation";
import {getCurrentAccount} from "@/lib/auth/account";
import {getOwnedTrack,getTrackDetailStatistics} from "@/lib/tracks/data";
import {isTrackId,parseTrackPage} from "@/lib/tracks/model";
import {trackDetailHref} from "@/lib/tracks/detail-model";
import {statisticsRange,validDate,type StatisticsView} from "@/lib/statistics/model";
import TrackDetail from "@/components/tracks/track-detail";

export const dynamic="force-dynamic";
export const metadata={title:"Track insights | FocusExam"};
type Query={view?:string|string[];date?:string|string[];month?:string|string[];history?:string|string[];page?:string|string[]};
export default async function Page({params,searchParams}:{params:Promise<{trackId:string}>;searchParams:Promise<Query>}){
 const account=await getCurrentAccount();if(!account)redirect("/login");
 const {trackId}=await params;if(!isTrackId(trackId))notFound();
 const track=await getOwnedTrack(account.user.id,trackId);if(!track)notFound();
 const query=await searchParams,view:StatisticsView=query.view==="day"||query.view==="month"?query.view:"week";
 const all=query.history==="all",page=parseTrackPage(query.page);
 const initial=await getTrackDetailStatistics(trackId,undefined,undefined,page,all);
 const candidate=view==="month"&&typeof query.month==="string"?query.month+"-01":query.date;
 const date=validDate(candidate)?candidate:initial.today,requestedRange=statisticsRange(view,date);
 const range={from:requestedRange.from<"1900-01-01"?"1900-01-01":requestedRange.from,to:requestedRange.to};
 const data=range.from===initial.from&&range.to===initial.to?initial:await getTrackDetailStatistics(trackId,range.from,range.to,page,all);
 if(page!==data.history.page)redirect(trackDetailHref(trackId,view,date,all,data.history.page));
 return <TrackDetail key={[trackId,view,date,all,page].join(":")} track={{...track,total_seconds:data.summary.all_seconds}} data={data} view={view} date={date}
  account={{displayName:account.profile.display_name,role:account.role}}/>;
}

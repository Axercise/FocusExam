import type {StatisticsDay,StatisticsView} from "@/lib/statistics/model";
export type TrackDetailSession={
 id:string;mode:"focus"|"lockin";duration_seconds:number;range_seconds:number;recap:string;
 started_at:string;ended_at:string;timezone:string;allocation_status:"precise"|"legacy_unallocated";
 first_date:string|null;last_date:string|null;range_first_date:string|null;range_last_date:string|null;
};
export type TrackDetailData={
 today:string;timezone:string;from:string;to:string;days:StatisticsDay[];
 summary:{all_seconds:number;today_seconds:number;week_seconds:number;month_seconds:number;
  week_from:string;month_from:string;session_count:number;legacy_count:number;legacy_seconds:number;};
 history:{page:number;pages:number;total:number;all:boolean;sessions:TrackDetailSession[]};
};
export function trackDetailHref(id:string,view:StatisticsView,date:string,all=false,page=1,anchor=false){
 const query=new URLSearchParams({view,[view==="month"?"month":"date"]:view==="month"?date.slice(0,7):date});
 if(all)query.set("history","all");if(page>1)query.set("page",String(page));
 return `/tracks/${encodeURIComponent(id)}?${query}${anchor?"#track-history":""}`;
}

import {redirect} from "next/navigation";
import {getCurrentAccount} from "@/lib/auth/account";
import {getGoalDay} from "@/lib/goals/data";
import {getTimerTrackChoices} from "@/lib/sessions/data";
import {parseTrackPage} from "@/lib/tracks/model";
import {validDate} from "@/lib/statistics/model";
import GoalsManager from "@/components/goals/goals-manager";
export const dynamic="force-dynamic";
export default async function Page({searchParams}:{searchParams:Promise<{date?:string;page?:string}>}){
 const account=await getCurrentAccount();if(!account)redirect("/login");
 const params=await searchParams,date=validDate(params.date)?params.date:undefined,requested=parseTrackPage(params.page);
 const [data,choices]=await Promise.all([getGoalDay(account.user.id,date,requested),getTimerTrackChoices(account.user.id)]);
 if(data.page!==requested)redirect("/goals?"+new URLSearchParams({...(date?{date}:{}),page:String(data.page)}));
 return <GoalsManager key={account.user.id+data.summary.date} data={data} choices={choices} ownerId={account.user.id} followsToday={!date}/>;
}


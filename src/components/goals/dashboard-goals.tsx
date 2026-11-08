"use client";
import {usePreferences} from "@/lib/preferences";
import type {GoalDay} from "@/lib/goals/model";
import type {TimerTrackPage} from "@/lib/sessions/types";
import GoalCollection from "./goal-collection";
import {useGoalRefresh} from "./use-goal-refresh";
export default function DashboardGoals({data,ownerId,choices}:{data:GoalDay;ownerId:string;choices:TimerTrackPage}){
 const {locale}=usePreferences();useGoalRefresh(data.summary.timezone,data.summary.today);
 return <GoalCollection key={ownerId+data.summary.date} data={data} ownerId={ownerId} choices={choices} locale={locale} compact/>;
}


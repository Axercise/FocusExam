export type GoalSummary={today:string;date:string;timezone:string;total:number;completed:number};
export type DailyGoal={id:string;goal_date:string;timezone:string;title:string;track_id:string|null;completed_at:string|null;revision:number;created_at:string;tracks:{name:string;archived_at:string|null}|null};
export type GoalDay={summary:GoalSummary;goals:DailyGoal[];page:number;pages:number};
export type GoalMessage="created"|"saved"|"deleted"|"completed"|"reopened"|"invalid_title"|"invalid_request"|"track_unavailable"|"conflict"|"auth_required"|"unavailable";
export type GoalActionState={message?:GoalMessage;success?:boolean};
export function validGoalTitle(value:unknown):value is string{return typeof value==="string"&&value.trim().length>0&&[...value.trim()].length<=200;}
export function validRevision(value:unknown){return typeof value==="string"&&/^\d{1,9}$/.test(value)?Number(value):null;}
export function goalProgress(completed:number,total:number){return total>0?Math.round(completed/total*100):0;}


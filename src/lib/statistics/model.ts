export type StatisticsView = "day" | "week" | "month";
export type StatisticsDay = { date: string; study_seconds: number; break_seconds: number };
export type StudyStatistics = {
  timezone: string; today: string; from: string; to: string; days: StatisticsDay[];
  current_streak: number; longest_streak: number; last_study_date: string | null;
  today_study_seconds: number; today_break_seconds: number;
  unallocated_sessions: number; unallocated_seconds: number;
  streak_minimum_seconds?: number;
};
export type StatisticsTrack = { id: string; name: string; archived_at: string | null };
export function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < "1900-01-01" || value > "9998-12-31") return false;
  const date = new Date(value + "T12:00:00Z");
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0,10) === value;
}
export function shiftDate(date: string, days: number) {
  const value = new Date(date + "T12:00:00Z"); value.setUTCDate(value.getUTCDate()+days);
  return value.toISOString().slice(0,10);
}
export function statisticsRange(view: StatisticsView, date: string) {
  if (view === "day") return {from:date,to:date};
  if (view === "week") return {from:shiftDate(date,-6),to:date};
  const from=date.slice(0,7)+"-01";
  const next=new Date(from+"T12:00:00Z"); next.setUTCMonth(next.getUTCMonth()+1);
  return {from,to:shiftDate(next.toISOString().slice(0,10),-1)};
}
export function adjacentDate(view: StatisticsView, date: string, direction: number) {
  if (view !== "month") return shiftDate(date,(view === "week" ? 7 : 1)*direction);
  const value=new Date(date.slice(0,7)+"-01T12:00:00Z");
  value.setUTCMonth(value.getUTCMonth()+direction); return value.toISOString().slice(0,10);
}
export function sumDays(days: StatisticsDay[]) {
  return days.reduce((sum,day)=>({study:sum.study+day.study_seconds,rest:sum.rest+day.break_seconds,active:sum.active+(day.study_seconds>0?1:0)}),{study:0,rest:0,active:0});
}
export function clockDuration(seconds: number) {
  const whole=Math.max(0,Math.floor(seconds));
  return [Math.floor(whole/3600),Math.floor(whole%3600/60),whole%60].map(n=>String(n).padStart(2,"0")).join(":");
}


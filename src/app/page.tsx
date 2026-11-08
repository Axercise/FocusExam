import Dashboard from "@/components/dashboard";
import { getCurrentAccount } from "@/lib/auth/account";
import { getDashboardTracks } from "@/lib/tracks/data";
import { getTimerTrackChoices } from "@/lib/sessions/data";
import { getStatistics } from "@/lib/statistics/data";
import { getGoalDay } from "@/lib/goals/data";
import { getStreakStatus } from "@/lib/streak/data";

export const dynamic = "force-dynamic";
export default async function Home() {
  const account = await getCurrentAccount();
  const [tracks, choices, statistics, goalDay, streakStatus] = account ? await Promise.all([getDashboardTracks(account.user.id),getTimerTrackChoices(account.user.id),getStatistics(),getGoalDay(account.user.id,undefined,1,true),getStreakStatus()]) : [[],{tracks:[],count:0,page:0},null,null,null];
  return <Dashboard account={account ? { displayName: account.profile.display_name, role: account.role } : null} personalTracks={tracks} timerOwnerId={account?.user.id ?? "guest"} timerTrackChoices={choices} statistics={statistics} goalDay={goalDay} streakStatus={streakStatus} />;
}

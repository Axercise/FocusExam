import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { parseStreakStatus } from "./model";

// The migration and UI can be deployed separately without interrupting timers.
export const getStreakStatus = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("study_streak_status", { p_claim_notice: false }).abortSignal(AbortSignal.timeout(12000));
  if (error?.code === "PGRST202" || error?.code === "42883") return null;
  if (error) throw new Error("Unable to load your streak.");
  const status = parseStreakStatus(data);
  if (!status) throw new Error("Invalid streak response.");
  return status;
});

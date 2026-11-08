"use server";

import { revalidatePath } from "next/cache";
import { createMutableClient } from "@/lib/supabase/server";
import { isTrackId } from "@/lib/tracks/model";
import { parseStreakStatus, type StreakStatus } from "./model";

export async function checkStreakAction(input: { expectedOwnerId: string; claimNotice: boolean }): Promise<{ status?: StreakStatus; error?: "auth" | "unavailable" | "not_installed" }> {
  if (!input || !isTrackId(input.expectedOwnerId) || typeof input.claimNotice !== "boolean") return { error: "auth" };
  try {
    const supabase = await createMutableClient();
    const identity = await supabase.auth.getUser();
    if (identity.error || identity.data.user?.id !== input.expectedOwnerId) return { error: "auth" };
    const { data, error } = await supabase.rpc("study_streak_status", { p_claim_notice: input.claimNotice }).abortSignal(AbortSignal.timeout(12000));
    if (error?.code === "PGRST202" || error?.code === "42883") return { error: "not_installed" };
    if (error) return { error: "unavailable" };
    const status = parseStreakStatus(data);
    if (!status) return { error: "unavailable" };
    if (status.notice) { revalidatePath("/"); revalidatePath("/statistics"); }
    return { status };
  } catch { return { error: "unavailable" }; }
}

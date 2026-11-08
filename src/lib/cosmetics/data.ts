import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { defaultAppearance, type CosmeticState } from "./model";
import type { StudyRewards } from "./rewards-model";

export const getCosmetics = cache(async () => {
  const client = await createClient();
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError || !user) return { ownerId: null, data: { balance: 0, owned: [], appearance: defaultAppearance, catalog: [] } as CosmeticState };
  const { data, error } = await client.rpc("cosmetics_state").abortSignal(AbortSignal.timeout(12000));
  if (error || !data) throw new Error("Unable to load decorations.");
  return { ownerId: user.id, data: data as unknown as CosmeticState };
});

export async function getStudyRewards(page = 1) {
  const client = await createClient();
  const { data, error } = await client.rpc("study_rewards", { p_page: page }).abortSignal(AbortSignal.timeout(12000));
  if (error || !data) throw new Error("Unable to load study rewards.");
  return data as unknown as StudyRewards;
}

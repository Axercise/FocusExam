import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { createClient } from "@supabase/supabase-js";

if (existsSync(".env.local")) loadEnvFile(".env.local");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error("Missing Supabase public environment variables.");
let legacyRole;
if (key.split(".").length === 3) {
  try { legacyRole = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString()).role; }
  catch { /* Reject invalid legacy keys below. */ }
}
if (!key.startsWith("sb_publishable_") && legacyRole !== "anon") {
  throw new Error("The connection check requires a publishable or legacy anon key.");
}
const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
for (const [table, column] of [["profiles", "id"], ["user_roles", "user_id"], ["tracks", "id"], ["timer_runs", "id"], ["study_sessions", "id"], ["timer_run_segments", "id"], ["session_day_allocations", "session_id"], ["daily_goals", "id"], ["study_streak_days", "id"], ["cosmetic_catalog", "id"], ["cosmetic_inventory", "item_id"], ["cosmetic_preferences", "user_id"], ["coin_ledger", "id"]]) {
  const { error, status } = await supabase.from(table).select(column).limit(1);
  if (![401, 403].includes(status) || error?.code !== "42501") {
    throw new Error(`Unexpected guest access for ${table}; status=${status}, code=${error?.code ?? "none"}`);
  }
}
const streak = await supabase.rpc("study_streak_status", { p_claim_notice: true });
if (![401, 403].includes(streak.status) || streak.error?.code !== "42501") throw new Error("Unexpected guest access to the streak RPC.");
const detail = await supabase.rpc("track_detail_statistics", { p_track_id: "00000000-0000-0000-0000-000000000000" });
if (![401, 403].includes(detail.status) || detail.error?.code !== "42501") throw new Error("Unexpected guest access to Track details.");
for (const [table,column] of [["daily_quest_progress","user_id"],["track_reward_progress","track_id"]]) {
  const result=await supabase.from(table).select(column).limit(1);
  if (![401,403].includes(result.status) || result.error?.code!=="42501") throw new Error(`Unexpected guest access to ${table}.`);
}
for (const [name,args] of [["cosmetics_state",{}],["cosmetics_command",{p_operation:"equip",p_item_id:"clock:default"}],["study_rewards",{p_page:1}]]) {
  const result=await supabase.rpc(name,args);
  if (![401,403].includes(result.status) || result.error?.code!=="42501") throw new Error(`Unexpected guest access to ${name}.`);
}
console.log("Supabase Data API verified: guest access to personal tables, streaks, Track details and decorations is denied.");

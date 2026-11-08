import type { Database } from "@/lib/supabase/database.types";

export type AppRole = Database["public"]["Enums"]["app_role"];
export type AdminPermission = "accounts.read" | "accounts.update" | "study_logs.read";

// UI hints only. Authoritative checks use database roles and RLS.
export function hasAdminPermission(role: AppRole, permission: AdminPermission) {
  return role === "admin" && ["accounts.read", "accounts.update", "study_logs.read"].includes(permission);
}

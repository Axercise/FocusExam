import "server-only";

import { createClient } from "@/lib/supabase/server";
import { hasAdminPermission, type AdminPermission } from "./permissions";

/** Re-read the DB role so revocation takes effect without waiting for JWT refresh. */
export async function getCurrentAccount() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    if (error.name === "AuthSessionMissingError" || error.name === "AuthInvalidJwtError" ||
      error.status === 401 || error.status === 403 ||
      ["bad_jwt", "session_not_found", "refresh_token_not_found", "refresh_token_already_used"].includes(error.code ?? "")) return null;
    throw new Error("Unable to verify the current account.");
  }
  if (!user) return null;
  const [profileResult, roleResult] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("user_roles").select("role").eq("user_id", user.id).single(),
  ]);
  if (profileResult.error || roleResult.error) {
    throw new Error("Unable to load the current account profile or role.");
  }
  return { user, profile: profileResult.data, role: roleResult.data.role };
}

/** Future server actions must check this before invoking privileged operations. */
export async function requireAdminPermission(permission: AdminPermission) {
  const account = await getCurrentAccount();
  if (!account || !hasAdminPermission(account.role, permission)) {
    throw new Error("Forbidden");
  }
  return account;
}

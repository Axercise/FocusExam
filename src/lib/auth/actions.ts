"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createMutableClient } from "@/lib/supabase/server";
import { getAppOrigin } from "./origin";
import type { AuthMessage, AuthState } from "./copy";
import { beginEmailVerification, clearPasswordVerification, getPasswordVerification } from "./email-verification";

function value(form: FormData, key: string) {
  const result = form.get(key);
  return typeof result === "string" ? result : "";
}
function emailValue(form: FormData) {
  const email = value(form, "email").trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}
function authError(error: { code?: string; status?: number }): AuthMessage {
  if (error.status === 429 || error.code?.includes("rate_limit")) return "rate_limited";
  if (error.code === "invalid_credentials") return "invalid_credentials";
  if (error.code === "email_not_confirmed") return "email_not_confirmed";
  if (error.code === "weak_password" || error.code === "same_password") return "weak_password";
  return "unavailable";
}

export async function loginAction(_previous: AuthState, form: FormData): Promise<AuthState> {
  const email = emailValue(form);
  const password = value(form, "password");
  if (!email || !password || password.length > 1024) return { message: "invalid_form" };
  await clearPasswordVerification();
  const supabase = await createMutableClient();
  const result = await supabase.auth.signInWithPassword({ email, password }).catch(() => null);
  if (!result) return { message: "unavailable" };
  if (result.error) return { message: authError(result.error) };
  revalidatePath("/", "layout");
  redirect("/");
}

export async function signupAction(_previous: AuthState, form: FormData): Promise<AuthState> {
  const email = emailValue(form);
  const password = value(form, "password");
  const name = value(form, "name").trim();
  if (!email || !name || name.length > 80) return { message: "invalid_form" };
  if (password.length < 8 || password.length > 128) return { message: "weak_password" };
  if (password !== value(form, "confirmPassword")) return { message: "password_mismatch" };
  await clearPasswordVerification();
  const supabase = await createMutableClient();
  const result = await supabase.auth.signUp({ email, password, options: {
    data: { full_name: name }, emailRedirectTo: `${getAppOrigin()}/auth/callback`,
  } }).catch(() => null);
  if (!result) return { message: "unavailable" };
  if (result.error?.code === "user_already_exists") return { message: "confirm_email", success: true };
  if (result.error) return { message: authError(result.error) };
  if (result.data.session) { revalidatePath("/", "layout"); redirect("/"); }
  return { message: "confirm_email", success: true };
}

export async function googleAction(): Promise<AuthState> {
  await clearPasswordVerification();
  const supabase = await createMutableClient();
  const result = await supabase.auth.signInWithOAuth({ provider: "google", options: {
    redirectTo: `${getAppOrigin()}/auth/callback`, skipBrowserRedirect: true,
  } }).catch(() => null);
  if (!result?.data.url || result.error) return { message: "oauth_failed" };
  redirect(result.data.url);
}

export async function requestResetAction(_previous: AuthState, form: FormData): Promise<AuthState> {
  const email = emailValue(form);
  if (!email) return { message: "invalid_form" };
  const result = await beginEmailVerification(email, "reset");
  if (result.error) return { message: authError(result.error) };
  return { message: "reset_sent", success: true };
}

export async function updatePasswordAction(_previous: AuthState, form: FormData): Promise<AuthState> {
  const password = value(form, "password");
  if (password.length < 8 || password.length > 128) return { message: "weak_password" };
  if (password !== value(form, "confirmPassword")) return { message: "password_mismatch" };
  const supabase = await createMutableClient();
  const identity = await supabase.auth.getUser().catch(() => null);
  if (!identity?.data.user || identity.error) return { message: "invalid_link" };
  if (!await getPasswordVerification(identity.data.user)) return { message: "verification_required" };
  const result = await supabase.auth.updateUser({ password }).catch(() => null);
  if (!result) return { message: "unavailable" };
  if (result.error) return { message: authError(result.error) };
  await clearPasswordVerification();
  revalidatePath("/", "layout");
  redirect("/account/security?status=password_updated");
}

export async function signOutAction() {
  const supabase = await createMutableClient();
  const result = await supabase.auth.signOut({ scope: "local" }).catch(() => null);
  if (!result || result.error) redirect("/account/profile?status=logout_failed");
  await clearPasswordVerification();
  revalidatePath("/", "layout");
  redirect("/login?status=signed_out");
}

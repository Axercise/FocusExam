"use server";

import { revalidatePath } from "next/cache";
import { createMutableClient } from "@/lib/supabase/server";
import { beginEmailVerification } from "@/lib/auth/email-verification";

export type AccountMessage = "name_saved" | "name_unchanged" | "name_cooldown" | "invalid_name" | "verification_sent" | "request_failed" | "rate_limited" | "no_email" | "email_delivery_failed";
export type AccountState = { message?: AccountMessage; success?: boolean };

export async function renameDisplayName(_previous: AccountState, form: FormData): Promise<AccountState> {
  const raw = form.get("displayName");
  const name = typeof raw === "string" ? raw.trim() : "";
  if (!name || [...name].length > 80) return { message: "invalid_name" };
  const supabase = await createMutableClient();
  const identity = await supabase.auth.getUser().catch(() => null);
  if (!identity?.data.user || identity.error) return { message: "request_failed" };
  const current = await supabase.from("profiles").select("display_name").eq("id", identity.data.user.id).single();
  if (current.error) return { message: "request_failed" };
  if (current.data.display_name === name) return { message: "name_unchanged", success: true };
  const result = await supabase.from("profiles").update({ display_name: name }).eq("id", identity.data.user.id).select("id").single();
  if (result.error) {
    if (result.error.code === "P0001" && result.error.message === "display_name_cooldown") return { message: "name_cooldown" };
    return { message: "request_failed" };
  }
  revalidatePath("/", "layout");
  return { message: "name_saved", success: true };
}

export async function requestPasswordVerification(): Promise<AccountState> {
  const supabase = await createMutableClient();
  const identity = await supabase.auth.getUser().catch(() => null);
  if (!identity?.data.user || identity.error) return { message: "request_failed" };
  const email = identity.data.user.email;
  if (!email) return { message: "no_email" };
  // Recipient comes only from the verified account, never from form data.
  const { error } = await beginEmailVerification(email, "account", identity.data.user.id);
  if (error) {
    if (error.code?.includes("rate_limit")) return { message: "rate_limited" };
    if (error.code === "email_address_not_authorized") return { message: "email_delivery_failed" };
    return { message: "request_failed" };
  }
  revalidatePath("/account/security");
  return { message: "verification_sent", success: true };
}

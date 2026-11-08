import { NextResponse, type NextRequest } from "next/server";
import { createMutableClient } from "@/lib/supabase/server";
import { clearPasswordVerification, createEmailChallengeClient, grantPasswordChange, readEmailChallenge } from "@/lib/auth/email-verification";

export async function GET(request: NextRequest) {
  const headers = new Headers({ "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" });
  const go = (path: string) => NextResponse.redirect(new URL(path, request.url), { headers });
  const pending = await readEmailChallenge();
  const code = request.nextUrl.searchParams.get("code");
  if (!code || request.nextUrl.searchParams.has("error") || (pending.present && !pending.challenge)) {
    await clearPasswordVerification();
    return go("/login?status=invalid_link");
  }
  const supabase = pending.challenge
    ? await createEmailChallengeClient(pending.challenge, headers)
    : await createMutableClient(headers);
  const result = await supabase.auth.exchangeCodeForSession(code).catch(() => null);
  if (!result || result.error || !result.data.user || !result.data.session) {
    await clearPasswordVerification();
    return go("/login?status=invalid_link");
  }
  if (pending.challenge) {
    const identity = await supabase.auth.getUser().catch(() => null);
    const user = identity?.data.user;
    if (!user || identity?.error || user.email?.toLowerCase() !== pending.challenge.email ||
      (pending.challenge.userId && user.id !== pending.challenge.userId)) {
      await clearPasswordVerification();
      return go("/login?status=invalid_link");
    }
    await grantPasswordChange(user, result.data.session);
    return go(pending.challenge.destination === "account" ? "/account/security?status=password_verified" : "/reset-password");
  }
  // Normal Google/signup callbacks never grant permission to change a password.
  await clearPasswordVerification();
  headers.set("Cache-Control", "private, no-store");
  return go("/");
}

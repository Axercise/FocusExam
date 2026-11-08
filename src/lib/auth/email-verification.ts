import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { User, Session } from "@supabase/supabase-js";
import { getSupabaseConfig } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { getAppOrigin } from "./origin";
import { openVerificationToken, sealVerificationToken } from "./verification-token";

const challengeCookie = "focusexam-email-challenge";
const grantCookie = "focusexam-password-grant";
type CookiePair = { name: string; value: string };
type EmailChallenge = { email: string; userId?: string; destination: "account" | "reset"; verifierCookies: CookiePair[] };
type PasswordGrant = { userId: string; sessionId: string; userVersion: string };

function key() {
  const secret = process.env.ACCOUNT_SECURITY_KEY;
  if (!secret) throw new Error("Missing server-side account security configuration.");
  return secret;
}
function options(maxAge: number) {
  return { httpOnly: true, sameSite: "lax" as const, secure: getAppOrigin().startsWith("https:"), path: "/", maxAge };
}
function isVerifier(name: string) { return name.includes("-auth-token-code-verifier"); }

export async function clearPasswordVerification() {
  const store = await cookies();
  store.delete(challengeCookie);
  store.delete(grantCookie);
  store.delete("focusexam-auth-intent");
}

export async function beginEmailVerification(email: string, destination: "account" | "reset", userId?: string) {
  const secret = key();
  const cookieStore = await cookies();
  const captured = new Map<string, CookiePair>();
  const { url, key: publishableKey } = getSupabaseConfig();
  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        for (const entry of cookiesToSet) {
          if (isVerifier(entry.name)) {
            if (entry.value) captured.set(entry.name, { name: entry.name, value: entry.value });
          } else cookieStore.set(entry.name, entry.value, entry.options);
        }
      },
    },
  });
  const result = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getAppOrigin()}/auth/callback`,
  }).catch(() => null);
  if (!result || result.error || !captured.size) {
    return { error: result?.error ?? { code: "verification_request_failed" } };
  }
  const challenge: EmailChallenge = { email: email.toLowerCase(), userId, destination, verifierCookies: [...captured.values()] };
  // Only the server can recover this verifier. A client cannot swap in a Google
  // PKCE flow or edit an unsigned intent cookie to obtain a password grant.
  const sealed = sealVerificationToken(challenge, secret, "email-challenge", 3600);
  if (sealed.length > 3800) throw new Error("Email verification state is too large.");
  await clearPasswordVerification();
  cookieStore.set(challengeCookie, sealed, options(3600));
  return { error: null };
}

export async function readEmailChallenge() {
  const raw = (await cookies()).get(challengeCookie)?.value;
  if (!raw) return { present: false as const, challenge: null };
  const decoded = openVerificationToken<EmailChallenge>(raw, key(), "email-challenge");
  const challenge = decoded?.payload;
  if (!challenge || typeof challenge.email !== "string" ||
    !["account", "reset"].includes(challenge.destination) ||
    !Array.isArray(challenge.verifierCookies) || !challenge.verifierCookies.length ||
    !challenge.verifierCookies.every(c => c && typeof c.name === "string" && isVerifier(c.name) && typeof c.value === "string")) {
    return { present: true as const, challenge: null };
  }
  return { present: true as const, challenge };
}

export async function createEmailChallengeClient(challenge: EmailChallenge, responseHeaders: Headers) {
  const cookieStore = await cookies();
  const { url, key: publishableKey } = getSupabaseConfig();
  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll: () => [...cookieStore.getAll().filter(c => !isVerifier(c.name)), ...challenge.verifierCookies],
      setAll(cookiesToSet, headers) {
        for (const entry of cookiesToSet) {
          if (!isVerifier(entry.name)) cookieStore.set(entry.name, entry.value, entry.options);
        }
        Object.entries(headers).forEach(([name, value]) => responseHeaders.set(name, value));
      },
    },
  });
}

export async function grantPasswordChange(user: User, session: Session) {
  const sessionId = JSON.parse(Buffer.from(session.access_token.split(".")[1], "base64url").toString()).session_id;
  if (typeof sessionId !== "string" || !user.updated_at) throw new Error("Incomplete verified session.");
  const proof: PasswordGrant = { userId: user.id, sessionId, userVersion: user.updated_at };
  const sealed = sealVerificationToken(proof, key(), "password-change", 600);
  const store = await cookies();
  store.delete(challengeCookie);
  store.set(grantCookie, sealed, options(600));
}

/** Requires an Auth-server-confirmed user and a cryptographically verified JWT. */
export async function getPasswordVerification(user: User) {
  const raw = (await cookies()).get(grantCookie)?.value;
  if (!raw) return null;
  const proof = openVerificationToken<PasswordGrant>(raw, key(), "password-change");
  if (!proof || proof.payload.userId !== user.id || proof.payload.userVersion !== user.updated_at) return null;
  const supabase = await createClient();
  const identity = await supabase.auth.getClaims().catch(() => null);
  if (!identity?.data?.claims || identity.error || identity.data.claims.sub !== user.id ||
    identity.data.claims.session_id !== proof.payload.sessionId) return null;
  return { expiresAt: new Date(proof.expiresAt).toISOString() };
}

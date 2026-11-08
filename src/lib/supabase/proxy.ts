import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";
import { getSupabaseConfig } from "./config";

export async function updateSession(request: NextRequest) {
  // The demo remains public. Guests have no session to refresh.
  const hasAuthCookie = request.cookies.getAll().some(({ name }) =>
    name.startsWith("sb-") && name.includes("-auth-token"));
  if (!hasAuthCookie) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const { url, key } = getSupabaseConfig();
  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });
  // Validates identity; never authorize requests using getSession() alone.
  await supabase.auth.getClaims();
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

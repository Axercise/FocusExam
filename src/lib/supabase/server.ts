import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";
import { getSupabaseConfig } from "./config";

/** Use for read-only Server Components. Mutating auth flows belong in handlers. */
async function createServerSupabaseClient(readOnly: boolean, responseHeaders?: Headers) {
  const cookieStore = await cookies();
  const { url, key } = getSupabaseConfig();
  return createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet, headers) => {
        if (readOnly) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Proxy handles refresh when a Server Component cannot write cookies.
          }
        } else {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        }
        if (responseHeaders) Object.entries(headers).forEach(([key, value]) => responseHeaders.set(key, value));
      },
    },
  });
}

export async function createClient() { return createServerSupabaseClient(true); }
export async function createMutableClient(responseHeaders?: Headers) {
  return createServerSupabaseClient(false, responseHeaders);
}

export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error("Missing Supabase configuration. See .env.example.");
  }
  const parsed = new URL(url);
  if (!["https:", "http:"].includes(parsed.protocol)) {
    throw new Error("Supabase URL must use HTTP or HTTPS.");
  }
  let legacyRole: unknown;
  if (key.split(".").length === 3) {
    try {
      legacyRole = JSON.parse(atob(key.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).role;
    } catch { /* Invalid legacy key; reject below. */ }
  }
  if (!key.startsWith("sb_publishable_") && legacyRole !== "anon") {
    throw new Error("Use a Supabase publishable key in public configuration.");
  }
  return { url, key };
}

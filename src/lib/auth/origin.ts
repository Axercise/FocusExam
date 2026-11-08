import "server-only";

export function getAppOrigin() {
  const url = new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Invalid application URL.");
  return url.origin;
}

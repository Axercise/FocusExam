import { redirect } from "next/navigation";
import { parseAuthMessage } from "@/lib/auth/copy";

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const message = parseAuthMessage(status);
  // Preserve old account links, including email verification/password outcomes.
  const section = message && ["password_verified", "password_updated", "verification_required"].includes(message)
    ? "security" : "profile";
  redirect(`/account/${section}${message ? `?status=${message}` : ""}`);
}

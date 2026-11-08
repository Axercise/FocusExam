import SecuritySettingsPanel from "@/components/account/security-settings";
import { parseAuthMessage } from "@/lib/auth/copy";
import { getPasswordVerification } from "@/lib/auth/email-verification";
import { maskEmail } from "@/lib/account/presentation";
import { requireSettingsAccount } from "@/lib/account/settings";

export default async function SecurityPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const account = await requireSettingsAccount();
  const params = await searchParams;
  const verification = await getPasswordVerification(account.user);
  return <SecuritySettingsPanel security={{
    maskedEmail: maskEmail(account.user.email ?? ""),
    timezone: account.profile.timezone,
    passwordVerifiedUntil: verification?.expiresAt ?? null,
  }} message={parseAuthMessage(params.status)} />;
}

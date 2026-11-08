import ProfileSettingsPanel from "@/components/account/profile-settings";
import { parseAuthMessage } from "@/lib/auth/copy";
import { canRenameAt, maskEmail, nextNameChangeAt } from "@/lib/account/presentation";
import { requireSettingsAccount } from "@/lib/account/settings";

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const account = await requireSettingsAccount();
  const params = await searchParams;
  const nextChange = nextNameChangeAt(account.profile.display_name_changed_at);
  return <ProfileSettingsPanel profile={{
    displayName: account.profile.display_name,
    maskedEmail: maskEmail(account.user.email ?? ""),
    nextNameChangeAt: nextChange,
    canRename: canRenameAt(nextChange),
    timezone: account.profile.timezone,
  }} message={parseAuthMessage(params.status)} />;
}

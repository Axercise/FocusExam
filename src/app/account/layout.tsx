import type { ReactNode } from "react";
import AccountShell from "@/components/account/account-shell";
import { maskEmail } from "@/lib/account/presentation";
import { requireSettingsAccount } from "@/lib/account/settings";

export const dynamic = "force-dynamic";

export default async function AccountLayout({ children }: { children: ReactNode }) {
  const account = await requireSettingsAccount();
  return <AccountShell account={{
    displayName: account.profile.display_name,
    maskedEmail: maskEmail(account.user.email ?? ""),
  }}>{children}</AccountShell>;
}

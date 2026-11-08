import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { getCurrentAccount } from "@/lib/auth/account";

// Shared by layout and nested pages; never cache account data across requests.
export const requireSettingsAccount = cache(async () => {
  const account = await getCurrentAccount();
  if (!account) redirect("/login");
  return account;
});

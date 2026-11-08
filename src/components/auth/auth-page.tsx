import { redirect } from "next/navigation";
import { getCurrentAccount } from "@/lib/auth/account";
import { parseAuthMessage } from "@/lib/auth/copy";
import AuthForm, { type AuthMode } from "./auth-form";
import { getPasswordVerification } from "@/lib/auth/email-verification";

export type AuthPageProps = { searchParams: Promise<{ status?: string }> };
export default async function AuthPage({ mode, searchParams }: AuthPageProps & { mode: AuthMode }) {
  if (mode !== "forgot") {
    const account = await getCurrentAccount();
    if ((mode === "login" || mode === "register") && account) redirect("/");
    if (mode === "reset" && !account) redirect("/login?status=invalid_link");
    if (mode === "reset" && account && !await getPasswordVerification(account.user)) redirect("/account/security?status=verification_required");
  }
  const params = await searchParams;
  return <AuthForm mode={mode} initialMessage={parseAuthMessage(params.status)} />;
}

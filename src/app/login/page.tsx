import AuthPage, { type AuthPageProps } from "@/components/auth/auth-page";
export const dynamic = "force-dynamic";
export default function LoginPage(props: AuthPageProps) { return <AuthPage {...props} mode="login" />; }

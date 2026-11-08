import AuthPage, { type AuthPageProps } from "@/components/auth/auth-page";
export const dynamic = "force-dynamic";
export default function ForgotPasswordPage(props: AuthPageProps) { return <AuthPage {...props} mode="forgot" />; }

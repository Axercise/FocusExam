import AuthPage, { type AuthPageProps } from "@/components/auth/auth-page";
export const dynamic = "force-dynamic";
export default function RegisterPage(props: AuthPageProps) { return <AuthPage {...props} mode="register" />; }

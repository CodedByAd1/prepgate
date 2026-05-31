import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LoginCard } from "@/components/auth/login-card";

export const metadata = {
  title: "Sign In",
  description: "Sign in to your PrepGate account to continue your GATE preparation.",
};

interface LoginPageProps {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth();
  const { callbackUrl, error } = await searchParams;

  if (session) {
    redirect(callbackUrl ?? "/dashboard");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-16">
      {/* Background orbs */}
      <div
        className="orb h-[500px] w-[500px]"
        style={{ background: "hsl(238 75% 58%)", left: "10%", top: "10%" }}
      />
      <div
        className="orb h-[350px] w-[350px]"
        style={{
          background: "hsl(168 72% 42%)",
          right: "10%",
          bottom: "10%",
          animationDelay: "4s",
        }}
      />

      <LoginCard callbackUrl={callbackUrl} error={error} />
    </div>
  );
}

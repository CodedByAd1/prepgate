"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";

interface LoginCardProps {
  callbackUrl?: string;
  error?: string;
}

const errorMessages: Record<string, string> = {
  OAuthSignin: "Could not sign in with Google. Please try again.",
  OAuthCallback: "Google sign-in was interrupted. Please try again.",
  OAuthCreateAccount: "Could not create your account. Please try again.",
  Callback: "An error occurred during sign-in. Please try again.",
  Default: "An unexpected error occurred. Please try again.",
};

export function LoginCard({ callbackUrl, error }: LoginCardProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signIn("google", {
        callbackUrl: callbackUrl ?? "/dashboard",
      });
    } catch {
      setIsLoading(false);
    }
  };

  const errorMessage = error
    ? (errorMessages[error] ?? errorMessages.Default)
    : null;

  return (
    <div className="relative z-10 w-full max-w-md animate-fade-up">
      {/* Card */}
      <div className="rounded-2xl border border-border bg-card shadow-xl">
        {/* Header */}
        <div className="px-8 pt-8 pb-6 text-center">
          {/* Logo */}
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl gradient-brand shadow-brand">
            <span className="text-xl font-extrabold text-white">PG</span>
          </div>

          <h1 className="text-2xl font-bold text-foreground">
            Welcome to PrepGate
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to continue your GATE CSE preparation journey
          </p>
        </div>

        {/* Body */}
        <div className="px-8 pb-8">
          {/* Error alert */}
          {errorMessage && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{errorMessage}</p>
            </div>
          )}

          {/* Google Sign-in */}
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="group flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-background px-6 py-3.5 text-sm font-semibold text-foreground shadow-sm transition-all duration-200 hover:border-border/80 hover:bg-muted hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              // Google SVG
              <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            )}
            {isLoading ? "Signing in…" : "Continue with Google"}
          </button>

          <p className="mt-5 text-center text-xs leading-relaxed text-muted-foreground">
            By continuing, you agree to our{" "}
            <a href="/terms" className="underline underline-offset-2 hover:text-foreground">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="/privacy" className="underline underline-offset-2 hover:text-foreground">
              Privacy Policy
            </a>
            .
          </p>
        </div>

        {/* Feature highlights */}
        <div className="rounded-b-2xl border-t border-border bg-muted/30 px-8 py-5">
          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">
            What you get
          </p>
          <ul className="space-y-2">
            {[
              "30+ years of GATE PYQs with explanations",
              "CBT mock tests with real GATE interface",
              "AI tutor available 24/7",
              "Deep performance analytics",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-green-500/15 text-green-600 dark:text-green-400">
                  <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="2,6 5,9 10,3" />
                  </svg>
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

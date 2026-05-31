import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { SessionProvider } from "@/components/providers/session-provider";
import { auth } from "@/lib/auth";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "PrepGate — GATE CSE Preparation Platform",
    template: "%s | PrepGate",
  },
  description:
    "The most comprehensive GATE CSE preparation platform. Practice PYQs, take mock tests, watch curated lectures, and get AI-powered guidance.",
  keywords: [
    "GATE CSE",
    "GATE preparation",
    "computer science",
    "mock test",
    "PYQ",
    "engineering entrance",
  ],
  authors: [{ name: "PrepGate" }],
  creator: "PrepGate",
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: process.env.NEXT_PUBLIC_APP_URL,
    title: "PrepGate — GATE CSE Preparation Platform",
    description:
      "The most comprehensive GATE CSE preparation platform with PYQs, mock tests, and AI tutoring.",
    siteName: "PrepGate",
  },
  twitter: {
    card: "summary_large_image",
    title: "PrepGate — GATE CSE Preparation Platform",
    description: "Crack GATE CSE with PrepGate.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f6fa" },
    { media: "(prefers-color-scheme: dark)",  color: "#0e1117" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
          storageKey="prepgate-theme"
        >
          <SessionProvider session={session}>
            {children}
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

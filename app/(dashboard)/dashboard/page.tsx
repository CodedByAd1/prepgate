import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  BookOpen,
  FileQuestion,
  ClipboardCheck,
  Bot,
  BarChart3,
  TrendingUp,
  Flame,
  ArrowRight,
  GraduationCap,
} from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Dashboard",
  description: "Your GATE CSE preparation overview.",
};

const quickActions = [
  {
    href: "/pyq",
    label: "Practice PYQs",
    description: "Solve previous year questions",
    icon: FileQuestion,
    color: "hsl(168 72% 42%)",
    bg: "hsl(168 72% 94%)",
    darkBg: "hsl(168 40% 14%)",
  },
  {
    href: "/mock-tests",
    label: "Take Mock Test",
    description: "Simulate the real GATE exam",
    icon: ClipboardCheck,
    color: "hsl(38 92% 50%)",
    bg: "hsl(38 92% 94%)",
    darkBg: "hsl(38 50% 14%)",
  },
  {
    href: "/lectures",
    label: "Watch Lectures",
    description: "Curated video playlists",
    icon: BookOpen,
    color: "hsl(238 75% 58%)",
    bg: "hsl(238 75% 96%)",
    darkBg: "hsl(238 40% 16%)",
  },
  {
    href: "/ai-tutor",
    label: "Ask AI Tutor",
    description: "Get instant concept help",
    icon: Bot,
    color: "hsl(320 65% 55%)",
    bg: "hsl(320 65% 95%)",
    darkBg: "hsl(320 35% 15%)",
  },
];

const subjectProgress = [
  { subject: "Algorithms", color: "hsl(160 70% 45%)" },
  { subject: "Data Structures", color: "hsl(30 80% 55%)" },
  { subject: "Operating Systems", color: "hsl(140 60% 45%)" },
  { subject: "Computer Networks", color: "hsl(50 80% 50%)" },
  { subject: "Databases", color: "hsl(260 65% 55%)" },
  { subject: "TOC", color: "hsl(340 70% 55%)" },
];

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const firstName = session.user?.name?.split(" ")[0] ?? "there";

  return (
    <div className="space-y-7">
      {/* ── Welcome header ── */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back, {firstName}! 👋
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Here&apos;s your preparation overview for today.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 shadow-xs">
          <Flame className="h-5 w-5 text-orange-500" />
          <div>
            <p className="text-xs text-muted-foreground">Study Streak</p>
            <p className="text-sm font-bold text-foreground">
              {session.user ? "0 days" : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Questions Solved",
            value: "0",
            icon: FileQuestion,
            color: "hsl(168 72% 42%)",
            bg: "hsl(168 72% 94%)",
            description: "Start solving PYQs",
          },
          {
            label: "Mock Tests Taken",
            value: "0",
            icon: ClipboardCheck,
            color: "hsl(38 92% 50%)",
            bg: "hsl(38 92% 94%)",
            description: "Take your first mock",
          },
          {
            label: "Videos Watched",
            value: "0",
            icon: BookOpen,
            color: "hsl(238 75% 58%)",
            bg: "hsl(238 75% 96%)",
            description: "Explore lecture hub",
          },
          {
            label: "Overall Accuracy",
            value: "—",
            icon: BarChart3,
            color: "hsl(199 89% 48%)",
            bg: "hsl(199 89% 94%)",
            description: "Solve questions to track",
          },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="stat-card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    {stat.label}
                  </p>
                  <p className="mt-1.5 text-3xl font-extrabold text-foreground">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {stat.description}
                  </p>
                </div>
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ background: stat.bg, color: stat.color }}
                >
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Quick actions + subject overview ── */}
      <div className="grid gap-5 lg:grid-cols-5">
        {/* Quick actions — 3 cols */}
        <div className="lg:col-span-3 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Quick Actions</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="stat-card group flex items-center gap-3.5 p-4"
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110"
                    style={{ background: action.bg, color: action.color }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {action.label}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {action.description}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-1" />
                </Link>
              );
            })}
          </div>
        </div>

        {/* Subject overview — 2 cols */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              Subject Progress
            </h2>
            <Link
              href="/analytics"
              className="text-xs text-primary hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="rounded-xl border border-border bg-card shadow-xs divide-y divide-border">
            {subjectProgress.map((item) => (
              <div key={item.subject} className="flex items-center gap-3 px-4 py-3">
                <div
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ background: item.color }}
                />
                <span className="flex-1 text-sm text-foreground">
                  {item.subject}
                </span>
                {/* Empty progress bar */}
                <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden">
                  <div className="h-full w-0 rounded-full transition-all duration-700" style={{ background: item.color }} />
                </div>
                <span className="w-7 text-right text-xs text-muted-foreground">0%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Get started CTA (empty state) ── */}
      <div className="rounded-2xl border border-dashed border-border bg-card/50 px-8 py-12 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl gradient-brand shadow-brand">
          <GraduationCap className="h-7 w-7 text-white" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-foreground">
          Start your GATE journey
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          Solve your first PYQ, watch a lecture, or take a mock test to see
          your performance data here.
        </p>
        <div className="mt-6 flex flex-col items-center gap-2.5 sm:flex-row sm:justify-center">
          <Link
            href="/pyq"
            className="inline-flex items-center gap-2 rounded-xl gradient-brand px-5 py-2.5 text-sm font-semibold text-white shadow-brand transition-all duration-200 hover:opacity-90"
          >
            <FileQuestion className="h-4 w-4" />
            Solve First Question
          </Link>
          <Link
            href="/lectures"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-5 py-2.5 text-sm font-semibold text-foreground shadow-sm transition-all duration-200 hover:shadow-md"
          >
            <BookOpen className="h-4 w-4" />
            Browse Lectures
          </Link>
        </div>
      </div>

      {/* ── AI Tutor promo ── */}
      <div className="relative overflow-hidden rounded-2xl gradient-brand p-px shadow-brand">
        <div className="flex flex-col items-start gap-4 rounded-2xl bg-transparent px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">AI Tutor is ready</p>
              <p className="text-xs text-white/75">
                Ask anything about GATE CSE — concepts, doubts, solutions.
              </p>
            </div>
          </div>
          <Link
            href="/ai-tutor"
            className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/25"
          >
            Start chatting
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

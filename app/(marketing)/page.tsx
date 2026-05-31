import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Brain,
  BarChart3,
  Clock,
  Target,
  Zap,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";

const features = [
  {
    icon: BookOpen,
    title: "Lecture Hub",
    description:
      "Curated YouTube playlists from top educators for all 13 GATE CSE subjects. Track your progress video by video.",
    color: "hsl(238 75% 58%)",
    bg: "hsl(238 75% 96%)",
    darkBg: "hsl(238 40% 16%)",
  },
  {
    icon: Target,
    title: "PYQ Practice",
    description:
      "30+ years of GATE Previous Year Questions with detailed explanations. Filter by subject, year, difficulty, and type.",
    color: "hsl(168 72% 42%)",
    bg: "hsl(168 72% 94%)",
    darkBg: "hsl(168 40% 14%)",
  },
  {
    icon: Clock,
    title: "CBT Mock Tests",
    description:
      "Simulate the real GATE experience with full-syllabus, subject-wise, and topic-wise mock tests with negative marking.",
    color: "hsl(38 92% 50%)",
    bg: "hsl(38 92% 94%)",
    darkBg: "hsl(38 50% 14%)",
  },
  {
    icon: Brain,
    title: "AI Tutor",
    description:
      "Get instant explanations for any concept or question. Your personal GATE tutor available 24/7.",
    color: "hsl(320 65% 55%)",
    bg: "hsl(320 65% 95%)",
    darkBg: "hsl(320 35% 15%)",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description:
      "Deep insights into your performance — subject accuracy, weak topics, time analysis, and mock test trends.",
    color: "hsl(199 89% 48%)",
    bg: "hsl(199 89% 94%)",
    darkBg: "hsl(199 50% 14%)",
  },
  {
    icon: Zap,
    title: "Smart Recommendations",
    description:
      "AI-powered suggestions on what to study next, based on your weak areas and study patterns.",
    color: "hsl(340 70% 55%)",
    bg: "hsl(340 70% 95%)",
    darkBg: "hsl(340 35% 14%)",
  },
];

const stats = [
  { value: "30+", label: "Years of PYQs" },
  { value: "13", label: "GATE Subjects" },
  { value: "5000+", label: "Practice Questions" },
  { value: "100+", label: "Mock Tests" },
];

const subjects = [
  "Algorithms",
  "Data Structures",
  "Operating Systems",
  "Computer Networks",
  "Databases",
  "Theory of Computation",
  "Compiler Design",
  "Computer Organization",
  "Digital Logic",
  "Discrete Maths",
  "Engineering Maths",
  "Programming in C",
  "General Aptitude",
];

export default function LandingPage() {
  return (
    <div className="relative overflow-hidden">
      {/* ── Hero Section ── */}
      <section className="relative flex min-h-[92vh] flex-col items-center justify-center px-4 py-24 text-center sm:px-6 lg:px-8">
        {/* Background orbs */}
        <div
          className="orb h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/4"
          style={{
            background: "hsl(238 75% 58%)",
            left: "30%",
            top: "20%",
          }}
        />
        <div
          className="orb h-[400px] w-[400px]"
          style={{
            background: "hsl(168 72% 42%)",
            right: "20%",
            top: "40%",
            animationDelay: "3s",
          }}
        />

        {/* Badge */}
        <div className="animate-fade-up relative z-10 mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm shadow-sm">
          <span className="flex h-2 w-2 rounded-full bg-green-500">
            <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-500 opacity-75" />
          </span>
          <span className="text-muted-foreground">
            Now in beta — Free for all GATE 2026 aspirants
          </span>
        </div>

        {/* Heading */}
        <h1 className="animate-fade-up-delay-1 relative z-10 mx-auto max-w-5xl text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
          Crack GATE CSE with{" "}
          <span className="gradient-text">precision & confidence</span>
        </h1>

        <p className="animate-fade-up-delay-2 relative z-10 mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
          The only GATE CSE platform you need — PYQs, CBT mock tests, curated
          lectures, AI tutoring, and deep analytics. All in one place.
        </p>

        {/* CTA buttons */}
        <div className="animate-fade-up-delay-3 relative z-10 mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/login"
            className="group inline-flex items-center gap-2 rounded-xl gradient-brand px-8 py-3.5 text-base font-semibold text-white shadow-brand transition-all duration-200 hover:opacity-90 hover:shadow-lg hover:-translate-y-0.5"
          >
            Start Preparing Free
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
          </Link>
          <Link
            href="#features"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-8 py-3.5 text-base font-semibold text-foreground shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
          >
            See Features
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        </div>

        {/* Social proof */}
        <div className="animate-fade-up-delay-4 relative z-10 mt-10 flex items-center gap-3">
          <div className="flex -space-x-2.5">
            {["#6366f1", "#06b6d4", "#10b981", "#f59e0b"].map((color, i) => (
              <div
                key={i}
                className="h-8 w-8 rounded-full border-2 border-card"
                style={{ background: color }}
              />
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            Join <strong className="text-foreground">2,000+</strong> GATE aspirants already preparing
          </p>
        </div>
      </section>

      {/* ── Stats Section ── */}
      <section className="border-y border-border/60 bg-card/50 py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-4xl font-extrabold gradient-text">{stat.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features Section ── */}
      <section id="features" className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Everything you need
            </p>
            <h2 className="mt-2 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
              Built for GATE success
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
              Every feature is designed with the GATE CSE syllabus in mind — no
              bloat, just what you need to score.
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="stat-card group relative overflow-hidden p-6"
                >
                  {/* Glow on hover */}
                  <div
                    className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-5 rounded-[var(--radius-lg)]"
                    style={{ background: feature.color }}
                  />
                  <div
                    className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110"
                    style={{
                      background: feature.bg,
                      color: feature.color,
                    }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Subjects Section ── */}
      <section className="bg-card/40 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Complete GATE CSE syllabus coverage
            </h2>
            <p className="mt-3 text-muted-foreground">
              All 13 subjects. Zero gaps.
            </p>
          </div>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            {subjects.map((subject) => (
              <div
                key={subject}
                className="flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-xs transition-all duration-200 hover:border-primary/40 hover:shadow-sm"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                {subject}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Section ── */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-2xl gradient-brand p-px shadow-brand">
            <div className="noise relative rounded-2xl bg-transparent px-8 py-16 text-center sm:px-16">
              <h2 className="text-3xl font-extrabold text-white sm:text-4xl lg:text-5xl">
                Your GATE rank starts today.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base text-white/80">
                Join PrepGate for free and start with 30+ years of PYQs,
                full-length mock tests, and an AI tutor that never sleeps.
              </p>
              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Link
                  href="/login"
                  className="group inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-primary shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl"
                >
                  Get Started Free
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                </Link>
              </div>
              <p className="mt-4 text-xs text-white/60">
                No credit card required. Sign in with Google.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

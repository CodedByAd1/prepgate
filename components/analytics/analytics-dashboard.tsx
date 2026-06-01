"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Cell,
} from "recharts";
import {
  CheckCircle2, Target, Flame, Clock, TrendingUp,
  Loader2, AlertCircle, BookOpen, BarChart3, Trophy,
} from "lucide-react";
import { SUBJECT_META } from "@/types";
import { Subject } from "@prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────
interface DailyPoint  { date: string; total: number; correct: number; accuracy: number }
interface SubjectStat { subject: Subject; total: number; correct: number; accuracy: number; marks: number }
interface TopicStat   { subject: Subject; topic: string; total: number; correct: number; accuracy: number }
interface Overview    { totalAttempts: number; correctTotal: number; overallAccuracy: number; totalMarks: number; avgTimeTaken: number; streak: number }
interface AnalyticsData { overview: Overview; daily: DailyPoint[]; subjects: SubjectStat[]; topics: TopicStat[] }

// ─── Helpers ──────────────────────────────────────────────────────────────────
const accColor = (n: number) => n >= 70 ? "#22c55e" : n >= 40 ? "#f59e0b" : "#ef4444";
const accClass  = (n: number) => n >= 70 ? "text-green-600" : n >= 40 ? "text-amber-600" : "text-red-500";
const accBadge  = (n: number) => n >= 70
  ? "bg-green-500/10 text-green-600 dark:text-green-400"
  : n >= 40 ? "bg-amber-500/10 text-amber-600" : "bg-red-500/10 text-red-500";

const shortDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

// ─── Skeleton ──────────────────────────────────────────────────────────────────
const Skel = ({ className = "" }: { className?: string }) => (
  <div className={`skeleton rounded-xl ${className}`} />
);

// ─── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, iconCls }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: string | number; sub: string; iconCls: string;
}) {
  return (
    <div className="stat-card flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconCls}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold tabular-nums text-foreground">{value}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>
      </div>
    </div>
  );
}

// ─── Custom Tooltip ────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 shadow-lg text-xs space-y-1">
      <p className="font-semibold text-foreground">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground capitalize">{p.name}:</span>
          <span className="font-semibold text-foreground">
            {p.name === "accuracy" ? `${p.value}%` : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Accuracy Trend ────────────────────────────────────────────────────────────
function AccuracyTrend({ daily }: { daily: DailyPoint[] }) {
  const pts = daily.filter((d) => d.total > 0);
  if (!pts.length)
    return <p className="flex h-52 items-center justify-center text-sm text-muted-foreground">No attempts yet — start practicing to see your trend.</p>;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={pts} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
        <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine y={70} stroke="#22c55e" strokeDasharray="4 4" strokeOpacity={0.5} label={{ value: "70%", position: "insideTopRight", fontSize: 10, fill: "#22c55e" }} />
        <Line type="monotone" dataKey="accuracy" name="accuracy" stroke="hsl(238 75% 58%)" strokeWidth={2.5} dot={{ fill: "hsl(238 75% 58%)", strokeWidth: 0, r: 3 }} activeDot={{ r: 5, strokeWidth: 0 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ─── Daily Activity ────────────────────────────────────────────────────────────
function DailyActivity({ daily }: { daily: DailyPoint[] }) {
  if (!daily.some((d) => d.total > 0))
    return <p className="flex h-52 items-center justify-center text-sm text-muted-foreground">No activity in the last 30 days.</p>;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={daily} margin={{ top: 8, right: 12, bottom: 0, left: -18 }} barSize={8} barGap={2}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} interval={4} />
        <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="total"   name="total"   fill="hsl(238 75% 58% / 0.25)" radius={[3, 3, 0, 0]} />
        <Bar dataKey="correct" name="correct" fill="#22c55e"                  radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Subject Chart ─────────────────────────────────────────────────────────────
function SubjectChart({ subjects }: { subjects: SubjectStat[] }) {
  if (!subjects.length)
    return <p className="flex h-48 items-center justify-center text-sm text-muted-foreground">No subject data yet.</p>;

  const data = subjects.map((s) => ({
    ...s,
    label: SUBJECT_META[s.subject]?.shortLabel ?? s.subject,
    fill:  SUBJECT_META[s.subject]?.color ?? "#888",
  }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 38)}>
      <BarChart layout="vertical" data={data} margin={{ top: 4, right: 36, bottom: 4, left: 4 }} barSize={14}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
        <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="label" width={60} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="accuracy" name="accuracy" radius={[0, 4, 4, 0]}>
          {data.map((d, i) => <Cell key={i} fill={accColor(d.accuracy)} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Topic Table ───────────────────────────────────────────────────────────────
function TopicTable({ topics }: { topics: TopicStat[] }) {
  if (!topics.length)
    return <p className="py-10 text-center text-sm text-muted-foreground">Solve questions to see topic-level insights.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            {["Topic", "Subject", "Attempts", "Correct", "Accuracy"].map((h) => (
              <th key={h} className="pb-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {topics.map((t, i) => {
            const m = SUBJECT_META[t.subject];
            return (
              <tr key={i} className="hover:bg-muted/30 transition-colors">
                <td className="py-2.5 pr-4 font-medium text-foreground">{t.topic}</td>
                <td className="py-2.5 pr-4">
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: `${m.color}18`, color: m.color }}>{m.shortLabel}</span>
                </td>
                <td className="py-2.5 pr-4 tabular-nums text-muted-foreground">{t.total}</td>
                <td className="py-2.5 pr-4 tabular-nums text-muted-foreground">{t.correct}</td>
                <td className="py-2.5">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${accBadge(t.accuracy)}`}>{t.accuracy}%</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────
export function AnalyticsDashboard() {
  const [data, setData]     = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState("");

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => r.json())
      .then((d) => { if (d.error) setError(d.error); else setData(d); })
      .catch(() => setError("Failed to load analytics."))
      .finally(() => setLoading(false));
  }, []);

  const ov = data?.overview;

  if (error)
    return (
      <div className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/8 px-4 py-4 text-sm text-destructive">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}
      </div>
    );

  const cards = [
    { icon: BookOpen,    label: "Questions Solved", value: (ov?.totalAttempts ?? 0).toLocaleString(), sub: "All time",                               iconCls: "bg-blue-500/10 text-blue-600" },
    { icon: CheckCircle2,label: "Correct",           value: (ov?.correctTotal  ?? 0).toLocaleString(), sub: `${(ov?.totalAttempts ?? 0) - (ov?.correctTotal ?? 0)} incorrect`, iconCls: "bg-green-500/10 text-green-600" },
    { icon: Target,      label: "Accuracy",          value: `${ov?.overallAccuracy ?? 0}%`,             sub: (ov?.overallAccuracy ?? 0) >= 70 ? "🎯 On track!" : "Keep going", iconCls: (ov?.overallAccuracy ?? 0) >= 70 ? "bg-green-500/10 text-green-600" : "bg-amber-500/10 text-amber-600" },
    { icon: Trophy,      label: "Net Marks",         value: ov?.totalMarks ?? 0,                         sub: "After −⅓ deductions",                  iconCls: "bg-purple-500/10 text-purple-600" },
    { icon: Flame,       label: "Streak",            value: `${ov?.streak ?? 0}d`,                       sub: ov?.streak ? "🔥 Keep it up!" : "Start today", iconCls: "bg-orange-500/10 text-orange-600" },
    { icon: Clock,       label: "Avg. Time / Q",     value: `${ov?.avgTimeTaken ?? 0}s`,                 sub: "Per question",                          iconCls: "bg-cyan-500/10 text-cyan-600" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Your complete GATE preparation performance overview</p>
      </div>

      {/* ── Overview cards ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <Skel key={i} className="h-28" />)
          : cards.map((c) => <StatCard key={c.label} {...c} />)
        }
      </div>

      {/* ── Charts row ── */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="stat-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Accuracy Trend</h2>
            <span className="ml-auto text-xs text-muted-foreground">Last 30 days</span>
          </div>
          <p className="text-xs text-muted-foreground">Dashed line = 70% GATE target</p>
          {loading ? <Skel className="h-[220px]" /> : <AccuracyTrend daily={data?.daily ?? []} />}
        </div>

        <div className="stat-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Daily Activity</h2>
            <span className="ml-auto text-xs text-muted-foreground">Last 30 days</span>
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-3">
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-green-500" />Correct</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-primary/30" />Total</span>
          </p>
          {loading ? <Skel className="h-[220px]" /> : <DailyActivity daily={data?.daily ?? []} />}
        </div>
      </div>

      {/* ── Subject performance ── */}
      <div className="stat-card p-5 space-y-5">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Subject Performance</h2>
        </div>

        {loading ? <Skel className="h-64" /> : (
          <div className="grid gap-8 lg:grid-cols-2 items-start">
            <SubjectChart subjects={data?.subjects ?? []} />

            {/* Progress bars */}
            <div className="space-y-3">
              {(data?.subjects ?? []).slice(0, 9).map((s) => {
                const m = SUBJECT_META[s.subject];
                return (
                  <div key={s.subject} className="flex items-center gap-3">
                    <span className="w-[68px] shrink-0 text-right text-[11px] font-semibold" style={{ color: m.color }}>
                      {m.shortLabel}
                    </span>
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${s.accuracy}%`, background: accColor(s.accuracy) }}
                      />
                    </div>
                    <span className={`w-9 text-right text-xs font-bold ${accClass(s.accuracy)}`}>{s.accuracy}%</span>
                    <span className="w-10 text-right text-[11px] text-muted-foreground">{s.total}q</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Topic table ── */}
      <div className="stat-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Topic-wise Accuracy</h2>
          <span className="ml-auto text-xs text-muted-foreground">Top 20 attempted topics</span>
        </div>
        {loading
          ? <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skel key={i} className="h-9" />)}</div>
          : <TopicTable topics={data?.topics ?? []} />
        }
      </div>
    </div>
  );
}

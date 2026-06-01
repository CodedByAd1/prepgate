"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import {
  CheckCircle2, XCircle, ChevronRight, Lightbulb, Clock,
  Target, RotateCcw, SlidersHorizontal, X, BookOpen,
  Loader2, AlertCircle, ArrowRight, Trophy, ImageIcon,
} from "lucide-react";
import { SUBJECT_META } from "@/types";
import { Subject, Difficulty, QuestionType } from "@prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Option { key: string; text: string }

interface Question {
  id: string;
  subject: Subject;
  topic: string;
  year: number;
  marks: number;
  difficulty: Difficulty;
  questionType: QuestionType;
  questionText: string;
  imageUrl: string | null;
  imageDescription: string | null;
  options: Option[] | null;
  answer: unknown;
  explanation: string | null;
  source: string | null;
  totalAttempts: number;
  correctAttempts: number;
}

interface AttemptResult {
  isCorrect: boolean;
  marksAwarded: number;
  correctAnswer: unknown;
  explanation: string | null;
}

interface SessionStats {
  correct: number;
  incorrect: number;
  skipped: number;
  totalMarks: number;
}

interface Filters {
  subject: string;
  topic: string;
  year: string;
  questionType: string;
  difficulty: string;
}

const EMPTY_FILTERS: Filters = {
  subject: "", topic: "", year: "", questionType: "", difficulty: "",
};

const DIFF_CONFIG = {
  EASY:   { label: "Easy",   color: "text-green-600 bg-green-500/10" },
  MEDIUM: { label: "Medium", color: "text-amber-600 bg-amber-500/10" },
  HARD:   { label: "Hard",   color: "text-red-600   bg-red-500/10"   },
} as const;

const TYPE_CONFIG = {
  MCQ: { label: "MCQ", color: "text-blue-600 bg-blue-500/10" },
  MSQ: { label: "MSQ", color: "text-purple-600 bg-purple-500/10" },
  NAT: { label: "NAT", color: "text-amber-600 bg-amber-500/10" },
} as const;

const YEARS = Array.from({ length: new Date().getFullYear() - 1990 + 1 }, (_, i) => new Date().getFullYear() - i);

// ─── Filter Panel ─────────────────────────────────────────────────────────────
function FilterPanel({
  filters, onChange, onApply, total, loading,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
  onApply: () => void;
  total: number;
  loading: boolean;
}) {
  const set = (key: keyof Filters) => (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) =>
    onChange({ ...filters, [key]: e.target.value });

  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <aside className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Filters</span>
        </div>
        {hasFilters && (
          <button
            onClick={() => onChange(EMPTY_FILTERS)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3 w-3" /> Clear
          </button>
        )}
      </div>

      {/* Subject */}
      <div className="space-y-1.5">
        <label className="label-form">Subject</label>
        <select value={filters.subject} onChange={set("subject")} className="input-form">
          <option value="">All Subjects</option>
          {Object.entries(SUBJECT_META).map(([k, m]) => (
            <option key={k} value={k}>{m.label}</option>
          ))}
        </select>
      </div>

      {/* Topic */}
      <div className="space-y-1.5">
        <label className="label-form">Topic</label>
        <input
          value={filters.topic}
          onChange={set("topic")}
          placeholder="e.g. Sorting, Graphs…"
          className="input-form"
        />
      </div>

      {/* Year */}
      <div className="space-y-1.5">
        <label className="label-form">Year</label>
        <select value={filters.year} onChange={set("year")} className="input-form">
          <option value="">All Years</option>
          {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Question Type */}
      <div className="space-y-1.5">
        <label className="label-form">Question Type</label>
        <select value={filters.questionType} onChange={set("questionType")} className="input-form">
          <option value="">All Types</option>
          <option value="MCQ">MCQ — Single Correct</option>
          <option value="MSQ">MSQ — Multi Correct</option>
          <option value="NAT">NAT — Numerical</option>
        </select>
      </div>

      {/* Difficulty */}
      <div className="space-y-1.5">
        <label className="label-form">Difficulty</label>
        <select value={filters.difficulty} onChange={set("difficulty")} className="input-form">
          <option value="">All Levels</option>
          <option value="EASY">Easy</option>
          <option value="MEDIUM">Medium</option>
          <option value="HARD">Hard</option>
        </select>
      </div>

      <button
        onClick={onApply}
        disabled={loading}
        className="flex items-center justify-center gap-2 rounded-xl gradient-brand py-2.5 text-sm font-semibold text-white shadow-brand transition-all hover:opacity-90 disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4" />}
        {loading ? "Loading…" : `Practice${total > 0 ? ` (${total})` : ""}`}
      </button>
    </aside>
  );
}

// ─── Session Stats Bar ────────────────────────────────────────────────────────
function StatsBar({
  stats, current, total,
}: {
  stats: SessionStats;
  current: number;
  total: number;
}) {
  const done = stats.correct + stats.incorrect + stats.skipped;
  const accuracy = done > 0 ? Math.round((stats.correct / (stats.correct + stats.incorrect || 1)) * 100) : 0;
  const streak = 0; // could track separately

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Target className="h-4 w-4" />
        <span>{current} / {total}</span>
      </div>

      <div className="h-4 w-px bg-border hidden sm:block" />

      <div className="flex items-center gap-1.5 text-sm font-semibold text-green-600 dark:text-green-400">
        <CheckCircle2 className="h-4 w-4" />
        {stats.correct} correct
      </div>
      <div className="flex items-center gap-1.5 text-sm font-semibold text-red-500">
        <XCircle className="h-4 w-4" />
        {stats.incorrect} wrong
      </div>

      <div className="h-4 w-px bg-border hidden sm:block" />

      <div className="flex items-center gap-1.5 text-sm">
        <span className="text-muted-foreground">Accuracy</span>
        <span
          className={`font-bold ${
            accuracy >= 70 ? "text-green-600" : accuracy >= 40 ? "text-amber-600" : "text-red-500"
          }`}
        >
          {accuracy}%
        </span>
      </div>

      <div className="ml-auto flex items-center gap-1.5 text-sm">
        <span className="text-muted-foreground">Marks</span>
        <span className="font-bold text-foreground">
          {stats.totalMarks >= 0 ? `+${stats.totalMarks}` : stats.totalMarks}
        </span>
      </div>
    </div>
  );
}

// ─── Question Card ────────────────────────────────────────────────────────────
function QuestionCard({
  question,
  onSubmit,
  onSkip,
  onNext,
  isLast,
}: {
  question: Question;
  onSubmit: (answer: unknown, timeTaken: number) => Promise<AttemptResult>;
  onSkip: () => void;
  onNext: () => void;
  isLast: boolean;
}) {
  // MCQ: string, MSQ: string[], NAT: string (parsed on submit)
  const [mcqAnswer, setMcqAnswer] = useState<string>("");
  const [msqAnswers, setMsqAnswers] = useState<string[]>([]);
  const [natAnswer, setNatAnswer] = useState<string>("");
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start timer when question loads
  useEffect(() => {
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [question.id]);

  const stopTimer = () => { if (timerRef.current) clearInterval(timerRef.current); };

  // Reset state when question changes
  useEffect(() => {
    setMcqAnswer("");
    setMsqAnswers([]);
    setNatAnswer("");
    setResult(null);
    setShowExplanation(false);
    setSubmitting(false);
  }, [question.id]);

  const toggleMSQ = (key: string) =>
    setMsqAnswers((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );

  const canSubmit = !result && (
    (question.questionType === "MCQ" && !!mcqAnswer) ||
    (question.questionType === "MSQ" && msqAnswers.length > 0) ||
    (question.questionType === "NAT" && natAnswer.trim() !== "")
  );

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    stopTimer();
    setSubmitting(true);

    let answer: unknown;
    if (question.questionType === "MCQ") answer = mcqAnswer;
    else if (question.questionType === "MSQ") answer = msqAnswers;
    else answer = parseFloat(natAnswer);

    const res = await onSubmit(answer, elapsed);
    setResult(res);
    setSubmitting(false);
    if (res.explanation) setShowExplanation(false); // start collapsed, user can expand
  };

  const opts = question.options ?? [];

  // ── Option state helper ────────────────────────────────────────────────────
  const getOptionState = (key: string): "default" | "correct" | "wrong" | "missed" => {
    if (!result) return "default";
    const correctAnswer = result.correctAnswer;
    const isCorrectKey =
      question.questionType === "MCQ"
        ? correctAnswer === key
        : Array.isArray(correctAnswer) && correctAnswer.includes(key);
    const isSelected =
      question.questionType === "MCQ"
        ? mcqAnswer === key
        : msqAnswers.includes(key);

    if (isCorrectKey && isSelected) return "correct";
    if (isCorrectKey && !isSelected) return "missed"; // correct but not selected (MSQ)
    if (!isCorrectKey && isSelected) return "wrong";
    return "default";
  };

  const OPTION_STYLES = {
    default: "border-border bg-card hover:border-primary/40 hover:bg-primary/5 cursor-pointer",
    correct: "border-green-500 bg-green-500/10 text-green-700 dark:text-green-400",
    wrong:   "border-red-500   bg-red-500/10   text-red-700   dark:text-red-400",
    missed:  "border-green-500 bg-green-500/5  border-dashed",
  };

  const subjectMeta = SUBJECT_META[question.subject];

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-6 shadow-sm">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
          style={{ background: `${subjectMeta.color}18`, color: subjectMeta.color }}
        >
          {subjectMeta.shortLabel}
        </span>
        <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold bg-muted text-muted-foreground">
          {question.topic}
        </span>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${DIFF_CONFIG[question.difficulty].color}`}>
          {DIFF_CONFIG[question.difficulty].label}
        </span>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${TYPE_CONFIG[question.questionType].color}`}>
          {TYPE_CONFIG[question.questionType].label}
        </span>
        <span className="ml-auto text-xs text-muted-foreground">
          GATE {question.year} · {question.marks}M
        </span>
      </div>

      {/* ── Question image (if uploaded by admin) ── */}
      {question.imageUrl && (
        <div className="relative w-full overflow-hidden rounded-xl border border-border bg-muted/30">
          <Image
            src={question.imageUrl}
            alt="Question diagram"
            width={800}
            height={400}
            className="w-full object-contain max-h-72"
            unoptimized
          />
        </div>
      )}

      {/* ── Gemini diagram description (shown when no image but has description) ── */}
      {!question.imageUrl && question.imageDescription && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm">
          <div className="flex items-center gap-2 mb-2">
            <ImageIcon className="h-3.5 w-3.5 text-amber-600" />
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Diagram Description (AI-generated)</span>
          </div>
          <p className="font-mono text-xs leading-relaxed text-amber-900 dark:text-amber-200 whitespace-pre-wrap">{question.imageDescription}</p>
        </div>
      )}

      {/* ── Question text ── */}
      <div className="text-base font-medium leading-relaxed text-foreground">
        {question.questionText}
      </div>

      {/* ── Options (MCQ / MSQ) ── */}
      {question.questionType !== "NAT" && opts.length > 0 && (
        <div className="space-y-2.5">
          {opts.map((opt) => {
            const state = getOptionState(opt.key);
            const isSelected =
              question.questionType === "MCQ"
                ? mcqAnswer === opt.key
                : msqAnswers.includes(opt.key);

            return (
              <button
                key={opt.key}
                disabled={!!result}
                onClick={() => {
                  if (question.questionType === "MCQ") setMcqAnswer(opt.key);
                  else toggleMSQ(opt.key);
                }}
                className={`w-full flex items-start gap-3 rounded-xl border-2 px-4 py-3 text-left text-sm transition-all duration-150 ${OPTION_STYLES[state]} ${
                  !result && isSelected ? "border-primary bg-primary/8" : ""
                }`}
              >
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-all ${
                  state === "correct" ? "border-green-500 bg-green-500 text-white" :
                  state === "wrong"   ? "border-red-500   bg-red-500   text-white" :
                  state === "missed"  ? "border-green-500 text-green-600" :
                  isSelected          ? "border-primary   bg-primary   text-white" :
                  "border-border text-muted-foreground"
                }`}>
                  {opt.key}
                </span>
                <span className={`flex-1 leading-snug ${state !== "default" ? "font-medium" : ""}`}>
                  {opt.text}
                </span>
                {state === "correct" && <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />}
                {state === "wrong"   && <XCircle      className="h-4 w-4 shrink-0 text-red-500"   />}
                {state === "missed"  && <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500 opacity-60" />}
              </button>
            );
          })}
        </div>
      )}

      {/* ── NAT input ── */}
      {question.questionType === "NAT" && (
        <div className="space-y-2">
          <label className="label-form">Enter your answer</label>
          <input
            type="number"
            step="any"
            value={natAnswer}
            onChange={(e) => setNatAnswer(e.target.value)}
            disabled={!!result}
            placeholder="Enter a numeric value…"
            className="input-form max-w-xs text-lg font-mono"
          />
          {result && (
            <p className={`text-sm font-medium ${result.isCorrect ? "text-green-600" : "text-red-500"}`}>
              Correct answer: <span className="font-bold">{String(result.correctAnswer)}</span>
            </p>
          )}
        </div>
      )}

      {/* ── Result banner ── */}
      {result && (
        <div className={`flex items-center gap-3 rounded-xl px-4 py-3 ${
          result.isCorrect
            ? "bg-green-500/10 border border-green-500/20"
            : "bg-red-500/10 border border-red-500/20"
        }`}>
          {result.isCorrect
            ? <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
            : <XCircle      className="h-5 w-5 shrink-0 text-red-500"   />
          }
          <div className="flex-1">
            <p className={`text-sm font-bold ${result.isCorrect ? "text-green-700 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
              {result.isCorrect ? "Correct!" : "Incorrect"}
            </p>
            <p className="text-xs text-muted-foreground">
              {result.isCorrect
                ? `+${result.marksAwarded} mark${result.marksAwarded !== 1 ? "s" : ""} awarded`
                : result.marksAwarded < 0
                ? `${result.marksAwarded.toFixed(2)} marks (negative marking)`
                : "No marks deducted"}
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {elapsed}s
          </div>
        </div>
      )}

      {/* ── Explanation ── */}
      {result && result.explanation && (
        <div>
          <button
            onClick={() => setShowExplanation((v) => !v)}
            className="flex items-center gap-2 text-sm font-medium text-primary hover:opacity-80 transition-opacity"
          >
            <Lightbulb className="h-4 w-4" />
            {showExplanation ? "Hide" : "Show"} Explanation
          </button>

          {showExplanation && (
            <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm leading-relaxed text-foreground">
              {result.explanation}
            </div>
          )}
        </div>
      )}

      {/* ── Action row ── */}
      <div className="flex items-center gap-3 pt-1">
        {!result ? (
          <>
            <button
              onClick={onSkip}
              className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
            >
              Skip
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl gradient-brand py-2.5 text-sm font-semibold text-white shadow-brand transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Checking…</>
              ) : (
                <>Submit Answer</>
              )}
            </button>
          </>
        ) : (
          <button
            onClick={onNext}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl gradient-brand py-2.5 text-sm font-semibold text-white shadow-brand transition-all hover:opacity-90"
          >
            {isLast ? <><Trophy className="h-4 w-4" /> Finish Session</> : <>{`Next Question`} <ChevronRight className="h-4 w-4" /></>}
          </button>
        )}
      </div>

      {/* Timer (subtle) */}
      {!result && (
        <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground/60">
          <Clock className="h-3 w-3" />
          <span className="font-mono">{Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}</span>
        </div>
      )}
    </div>
  );
}

// ─── Empty / Finished States ──────────────────────────────────────────────────
function EmptyState({ hasFilters, onReset }: { hasFilters: boolean; onReset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 px-8 py-20 text-center">
      <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-base font-semibold text-foreground">No questions found</h3>
      <p className="mt-1 text-sm text-muted-foreground max-w-xs">
        {hasFilters
          ? "No questions match your current filters. Try broadening them."
          : "Questions will appear here once added to the database by an admin."}
      </p>
      {hasFilters && (
        <button
          onClick={onReset}
          className="mt-5 flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          <RotateCcw className="h-4 w-4" /> Reset Filters
        </button>
      )}
    </div>
  );
}

function SessionComplete({ stats, onRestart }: { stats: SessionStats; onRestart: () => void }) {
  const done = stats.correct + stats.incorrect;
  const accuracy = done > 0 ? Math.round((stats.correct / done) * 100) : 0;

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card px-8 py-16 text-center gap-5 shadow-sm">
      <div className="flex h-20 w-20 items-center justify-center rounded-full gradient-brand shadow-brand">
        <Trophy className="h-10 w-10 text-white" />
      </div>
      <div>
        <h3 className="text-xl font-bold text-foreground">Session Complete!</h3>
        <p className="mt-1 text-sm text-muted-foreground">Here's how you did</p>
      </div>
      <div className="grid grid-cols-3 gap-4 w-full max-w-xs">
        {[
          { label: "Correct", value: stats.correct, color: "text-green-600" },
          { label: "Wrong",   value: stats.incorrect, color: "text-red-500" },
          { label: "Accuracy", value: `${accuracy}%`, color: accuracy >= 70 ? "text-green-600" : "text-amber-600" },
        ].map((s) => (
          <div key={s.label} className="flex flex-col items-center gap-1 rounded-xl bg-muted/50 py-3">
            <span className={`text-2xl font-bold ${s.color}`}>{s.value}</span>
            <span className="text-xs text-muted-foreground">{s.label}</span>
          </div>
        ))}
      </div>
      <p className="text-sm font-medium text-foreground">
        Net marks: <span className={stats.totalMarks >= 0 ? "text-green-600" : "text-red-500"}>
          {stats.totalMarks >= 0 ? `+${stats.totalMarks}` : stats.totalMarks}
        </span>
      </p>
      <button
        onClick={onRestart}
        className="flex items-center gap-2 rounded-xl gradient-brand px-6 py-2.5 text-sm font-semibold text-white shadow-brand transition-all hover:opacity-90"
      >
        <RotateCcw className="h-4 w-4" /> Practice Again
      </button>
    </div>
  );
}

// ─── Main PYQ Practice Component ──────────────────────────────────────────────
export function PYQPractice() {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(EMPTY_FILTERS);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [stats, setStats] = useState<SessionStats>({ correct: 0, incorrect: 0, skipped: 0, totalMarks: 0 });

  const PAGE_SIZE = 20;

  // ── Fetch a page of questions ──────────────────────────────────────────────
  const fetchQuestions = useCallback(async (f: Filters, pg: number, append = false) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (f.subject) params.set("subject", f.subject);
      if (f.topic) params.set("topic", f.topic);
      if (f.year) params.set("year", f.year);
      if (f.questionType) params.set("questionType", f.questionType);
      if (f.difficulty) params.set("difficulty", f.difficulty);
      params.set("isVerified", "true");
      params.set("page", String(pg));
      params.set("limit", String(PAGE_SIZE));
      params.set("sortBy", "year");
      params.set("sortOrder", "desc");

      const res = await fetch(`/api/questions?${params}`);
      const data = await res.json();

      if (!res.ok) { setError(data.error ?? "Failed to load questions"); return; }

      setTotalCount(data.pagination.total);
      setQuestions((prev) => append ? [...prev, ...data.questions] : data.questions);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Start / apply filters ──────────────────────────────────────────────────
  const handleStart = async () => {
    setAppliedFilters(filters);
    setCurrentIndex(0);
    setPage(1);
    setStats({ correct: 0, incorrect: 0, skipped: 0, totalMarks: 0 });
    setFinished(false);
    setStarted(true);
    await fetchQuestions(filters, 1, false);
  };

  // ── Fetch next page when running low ──────────────────────────────────────
  useEffect(() => {
    const remaining = questions.length - currentIndex;
    if (started && remaining <= 3 && questions.length < totalCount && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchQuestions(appliedFilters, nextPage, true);
    }
  }, [currentIndex, questions.length, totalCount, started, loading, page, appliedFilters, fetchQuestions]);

  // ── Submit attempt ─────────────────────────────────────────────────────────
  const handleSubmit = async (answer: unknown, timeTaken: number): Promise<AttemptResult> => {
    const q = questions[currentIndex];
    const res = await fetch(`/api/questions/${q.id}/attempt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selectedAnswer: answer, timeTaken }),
    });
    const data = await res.json();
    const result: AttemptResult = data.result;

    setStats((prev) => ({
      correct:    prev.correct    + (result.isCorrect ? 1 : 0),
      incorrect:  prev.incorrect  + (result.isCorrect ? 0 : 1),
      skipped:    prev.skipped,
      totalMarks: Math.round((prev.totalMarks + result.marksAwarded) * 100) / 100,
    }));

    return result;
  };

  // ── Skip ──────────────────────────────────────────────────────────────────
  const handleSkip = () => {
    setStats((prev) => ({ ...prev, skipped: prev.skipped + 1 }));
    handleNext();
  };

  // ── Next question ──────────────────────────────────────────────────────────
  const handleNext = () => {
    if (currentIndex + 1 >= questions.length && questions.length >= totalCount) {
      setFinished(true);
    } else {
      setCurrentIndex((i) => i + 1);
    }
  };

  const currentQuestion = questions[currentIndex];
  const hasFilters = Object.values(filters).some(Boolean);
  const isLast = currentIndex + 1 >= questions.length && questions.length >= totalCount;

  return (
    <div className="space-y-5">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">PYQ Practice</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Practice GATE previous year questions with instant feedback
        </p>
      </div>

      {/* Stats bar — visible after starting */}
      {started && !finished && (
        <StatsBar stats={stats} current={currentIndex + 1} total={totalCount} />
      )}

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* ── Filter panel ── */}
        <FilterPanel
          filters={filters}
          onChange={setFilters}
          onApply={handleStart}
          total={started ? totalCount : 0}
          loading={loading && !started}
        />

        {/* ── Question area ── */}
        <div className="min-h-[400px]">
          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm text-destructive mb-4">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {!started ? (
            /* ── Welcome state ── */
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 px-8 py-24 text-center gap-5">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl gradient-brand shadow-brand">
                <Target className="h-8 w-8 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Ready to practice?</h2>
                <p className="mt-1.5 text-sm text-muted-foreground max-w-xs">
                  Set your filters on the left and click <strong>Practice</strong> to start. 
                  Your attempts will be tracked and contribute to your analytics.
                </p>
              </div>
              <button
                onClick={handleStart}
                className="flex items-center gap-2 rounded-xl gradient-brand px-6 py-2.5 text-sm font-semibold text-white shadow-brand transition-all hover:opacity-90"
              >
                <ArrowRight className="h-4 w-4" />
                Start Practice
              </button>
            </div>
          ) : finished ? (
            <SessionComplete stats={stats} onRestart={() => {
              setStarted(false);
              setFinished(false);
              setQuestions([]);
              setStats({ correct: 0, incorrect: 0, skipped: 0, totalMarks: 0 });
            }} />
          ) : loading && questions.length === 0 ? (
            <div className="flex items-center justify-center rounded-2xl border border-border bg-card py-32">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : questions.length === 0 ? (
            <EmptyState hasFilters={hasFilters} onReset={() => { setFilters(EMPTY_FILTERS); setStarted(false); }} />
          ) : currentQuestion ? (
            <QuestionCard
              key={currentQuestion.id}
              question={currentQuestion}
              onSubmit={handleSubmit}
              onSkip={handleSkip}
              onNext={handleNext}
              isLast={isLast}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

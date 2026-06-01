"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  SlidersHorizontal,
  Upload,
} from "lucide-react";
import { QuestionFormModal } from "@/components/admin/question-form-modal";
import { BulkImportModal } from "@/components/admin/bulk-import-modal";
import { SUBJECT_META } from "@/types";
import { Subject, Difficulty, QuestionType } from "@prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Question {
  id: string;
  subject: Subject;
  topic: string;
  year: number;
  marks: number;
  difficulty: Difficulty;
  questionType: QuestionType;
  questionText: string;
  options: { key: string; text: string }[] | null;
  answer: unknown;
  explanation: string | null;
  imageUrl: string | null;
  tags: string[];
  source: string | null;
  paperSet: string | null;
  isVerified: boolean;
  totalAttempts: number;
  correctAttempts: number;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// ─── Badge helpers ─────────────────────────────────────────────────────────────
const TYPE_COLORS: Record<QuestionType, string> = {
  MCQ: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  MSQ: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  NAT: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
};

const DIFF_COLORS: Record<Difficulty, string> = {
  EASY: "bg-green-500/10 text-green-600 dark:text-green-400",
  MEDIUM: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  HARD: "bg-red-500/10 text-red-600 dark:text-red-400",
};

// ─── Component ─────────────────────────────────────────────────────────────────
export function QuestionsManager() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [questionType, setQuestionType] = useState("");
  const [year, setYear] = useState("");
  const [page, setPage] = useState(1);

  // Modal state
  const [modal, setModal] = useState<
    | { type: "add" }
    | { type: "edit"; question: Question }
    | { type: "delete"; question: Question }
    | null
  >(null);

  const [deleting, setDeleting] = useState(false);
  const [showImport, setShowImport] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (subject) params.set("subject", subject);
      if (difficulty) params.set("difficulty", difficulty);
      if (questionType) params.set("questionType", questionType);
      if (year) params.set("year", year);
      params.set("page", String(page));
      params.set("limit", "15");
      params.set("sortBy", "year");
      params.set("sortOrder", "desc");

      const res = await fetch(`/api/questions?${params.toString()}`);
      const data = await res.json();
      setQuestions(data.questions ?? []);
      setPagination(data.pagination ?? null);
    } finally {
      setLoading(false);
    }
  }, [search, subject, difficulty, questionType, year, page]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, subject, difficulty, questionType, year]);

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      await fetch(`/api/questions/${id}`, { method: "DELETE" });
      setModal(null);
      fetchQuestions();
    } finally {
      setDeleting(false);
    }
  };

  const YEARS = Array.from(
    { length: new Date().getFullYear() - 1990 + 1 },
    (_, i) => new Date().getFullYear() - i
  );

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Question Bank</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {pagination ? `${pagination.total.toLocaleString()} questions total` : "Loading…"}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition-all hover:bg-muted hover:-translate-y-0.5"
          >
            <Upload className="h-4 w-4" />
            Import PDF
          </button>
          <button
            onClick={() => setModal({ type: "add" })}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl gradient-brand px-4 py-2.5 text-sm font-semibold text-white shadow-brand transition-all hover:opacity-90 hover:-translate-y-0.5"
          >
            <Plus className="h-4 w-4" />
            Add Question
          </button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search question text, topic, or tags…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Filter row */}
        <div className="flex flex-wrap items-center gap-2">
          <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground shrink-0" />

          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All Subjects</option>
            {Object.entries(SUBJECT_META).map(([k, m]) => (
              <option key={k} value={k}>{m.shortLabel}</option>
            ))}
          </select>

          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All Years</option>
            {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>

          <select
            value={questionType}
            onChange={(e) => setQuestionType(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All Types</option>
            <option value="MCQ">MCQ</option>
            <option value="MSQ">MSQ</option>
            <option value="NAT">NAT</option>
          </select>

          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All Difficulties</option>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </select>

          {(search || subject || difficulty || questionType || year) && (
            <button
              onClick={() => {
                setSearch(""); setSubject(""); setDifficulty("");
                setQuestionType(""); setYear("");
              }}
              className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear filters
            </button>
          )}

          <button
            onClick={fetchQuestions}
            className="ml-auto flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : questions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-sm font-medium text-foreground">No questions found</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {search || subject || difficulty || questionType || year
                ? "Try adjusting your filters"
                : "Click \"Add Question\" to add your first question"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Question</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Subject</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Year</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Diff.</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Marks</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">✓</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {questions.map((q) => {
                  const subjMeta = SUBJECT_META[q.subject];
                  return (
                    <tr key={q.id} className="group hover:bg-muted/30 transition-colors">
                      {/* Question text */}
                      <td className="max-w-xs px-4 py-3">
                        <p className="line-clamp-2 text-sm text-foreground">{q.questionText}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{q.topic}</p>
                      </td>

                      {/* Subject */}
                      <td className="px-3 py-3">
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                          style={{ background: `${subjMeta.color}18`, color: subjMeta.color }}
                        >
                          {subjMeta.shortLabel}
                        </span>
                      </td>

                      {/* Year */}
                      <td className="px-3 py-3 text-xs font-medium text-foreground">{q.year}</td>

                      {/* Type */}
                      <td className="px-3 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${TYPE_COLORS[q.questionType]}`}>
                          {q.questionType}
                        </span>
                      </td>

                      {/* Difficulty */}
                      <td className="px-3 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${DIFF_COLORS[q.difficulty]}`}>
                          {q.difficulty.charAt(0) + q.difficulty.slice(1).toLowerCase()}
                        </span>
                      </td>

                      {/* Marks */}
                      <td className="px-3 py-3 text-xs text-muted-foreground">{q.marks}M</td>

                      {/* Verified */}
                      <td className="px-3 py-3">
                        {q.isVerified ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-muted-foreground/40" />
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setModal({ type: "edit", question: q })}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground hover:border-primary/40 hover:text-primary transition-all"
                            title="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setModal({ type: "delete", question: q })}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground hover:border-destructive/40 hover:text-destructive transition-all"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination ── */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">
              Page {pagination.page} of {pagination.totalPages} · {pagination.total} total
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={!pagination.hasPrev}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground disabled:opacity-40 hover:bg-muted transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!pagination.hasNext}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground disabled:opacity-40 hover:bg-muted transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Bulk Import Modal ── */}
      {showImport && (
        <BulkImportModal
          onClose={() => setShowImport(false)}
          onImported={() => { setShowImport(false); fetchQuestions(); }}
        />
      )}

      {/* ── Add / Edit Modal ── */}
      {(modal?.type === "add" || modal?.type === "edit") && (
        <QuestionFormModal
          mode={modal.type}
          question={modal.type === "edit" ? modal.question : undefined}
          onClose={() => setModal(null)}
          onSaved={fetchQuestions}
        />
      )}

      {/* ── Delete Confirmation ── */}
      {modal?.type === "delete" && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setModal(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-sm animate-fade-up rounded-2xl border border-border bg-card p-6 shadow-xl">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 mb-4">
                <Trash2 className="h-6 w-6 text-destructive" />
              </div>
              <h3 className="text-base font-bold text-foreground">Delete Question?</h3>
              <p className="mt-2 text-sm text-muted-foreground line-clamp-3">
                "{modal.question.questionText}"
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                This is a soft delete — attempt history is preserved.
              </p>
              <div className="mt-5 flex gap-3">
                <button
                  onClick={() => setModal(null)}
                  className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(modal.question.id)}
                  disabled={deleting}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-destructive py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60 transition-all"
                >
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Delete
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Save,
  Loader2,
  ImageIcon,
  FileCheck,
  AlertCircle,
  BookOpen,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ProgressTracker } from "./progress-tracker";

// ─── Types ────────────────────────────────────────────────────────────────────

type ReviewStatus = "PENDING" | "APPROVED" | "REJECTED";
type QuestionType = "MCQ" | "MSQ" | "NAT";
type Difficulty = "EASY" | "MEDIUM" | "HARD";

type Subject =
  | "ENGINEERING_MATHS"
  | "DISCRETE_MATHS"
  | "ALGORITHMS"
  | "DATA_STRUCTURES"
  | "THEORY_OF_COMPUTATION"
  | "COMPILER_DESIGN"
  | "OPERATING_SYSTEMS"
  | "COMPUTER_NETWORKS"
  | "DATABASES"
  | "COMPUTER_ORGANIZATION"
  | "DIGITAL_LOGIC"
  | "PROGRAMMING_C"
  | "GENERAL_APTITUDE";

interface ExtractedQuestion {
  id: string;
  questionNumber: number;
  questionText: string;
  questionType: QuestionType;
  options: Record<string, string> | null;
  imageUrl: string | null;
  containsDiagram: boolean;
  continued: boolean;
  extractionConfidence: number;
  reviewStatus: ReviewStatus;
  subject: Subject | null;
  topic: string | null;
  year: number | null;
  marks: number | null;
  difficulty: Difficulty | null;
  answer: unknown;
  explanation: string | null;
  pdfPage?: { pageNumber: number; imageUrl: string } | null;
}

interface PdfImportInfo {
  id: string;
  fileName: string;
  status: string;
  totalPages: number;
  processedPages: number;
  progressPercent: number;
}

const SUBJECTS: { value: Subject; label: string }[] = [
  { value: "ENGINEERING_MATHS", label: "Engineering Maths" },
  { value: "DISCRETE_MATHS", label: "Discrete Maths" },
  { value: "ALGORITHMS", label: "Algorithms" },
  { value: "DATA_STRUCTURES", label: "Data Structures" },
  { value: "THEORY_OF_COMPUTATION", label: "Theory of Computation" },
  { value: "COMPILER_DESIGN", label: "Compiler Design" },
  { value: "OPERATING_SYSTEMS", label: "Operating Systems" },
  { value: "COMPUTER_NETWORKS", label: "Computer Networks" },
  { value: "DATABASES", label: "Databases" },
  { value: "COMPUTER_ORGANIZATION", label: "Computer Organization" },
  { value: "DIGITAL_LOGIC", label: "Digital Logic" },
  { value: "PROGRAMMING_C", label: "Programming (C)" },
  { value: "GENERAL_APTITUDE", label: "General Aptitude" },
];

// ─── Diagram Viewer ───────────────────────────────────────────────────────────

/**
 * Renders a diagram from a question.
 * - PDF URLs: renders inline via <embed> with optional page anchor
 * - Image URLs: renders via <img>
 */
function DiagramViewer({
  url,
  pageNumber,
  questionNumber,
}: {
  url: string;
  pageNumber?: number;
  questionNumber: number;
}) {
  const isPdf =
    url.toLowerCase().includes(".pdf") ||
    url.toLowerCase().includes("/pdf-imports/");

  if (isPdf) {
    // Build PDF URL with page anchor so the viewer opens at the right page
    const pdfUrl = pageNumber ? `${url}#page=${pageNumber}` : url;
    return (
      <div className="space-y-2">
        <embed
          src={pdfUrl}
          type="application/pdf"
          className="w-full rounded-xl border border-border bg-muted"
          style={{ height: "320px" }}
        />
        <a
          href={pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <ExternalLink className="h-3 w-3" />
          Open PDF{pageNumber ? ` at page ${pageNumber}` : ""} in new tab
        </a>
      </div>
    );
  }

  // Regular image
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={`Question ${questionNumber} diagram`}
      className="w-full rounded-xl object-contain"
      style={{ maxHeight: "320px" }}
    />
  );
}

function ConfidenceMeter({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color =
    pct >= 85
      ? "bg-success"
      : pct >= 60
        ? "bg-warning"
        : "bg-destructive";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground">{pct}%</span>
    </div>
  );
}

function StatusBadge({ status }: { status: ReviewStatus }) {
  const config = {
    PENDING: { label: "Pending", classes: "bg-warning/10 text-warning" },
    APPROVED: { label: "Approved", classes: "bg-success/10 text-success" },
    REJECTED: { label: "Rejected", classes: "bg-destructive/10 text-destructive" },
  };
  const c = config[status];
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", c.classes)}>
      {c.label}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ReviewInterface({ importId }: { importId: string }) {
  const [importInfo, setImportInfo] = useState<PdfImportInfo | null>(null);
  const [questions, setQuestions] = useState<ExtractedQuestion[]>([]);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [finalizeResult, setFinalizeResult] = useState<{
    message: string;
    errors?: string[];
  } | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  // Edited state for the selected question
  const [editedFields, setEditedFields] = useState<Partial<ExtractedQuestion>>({});

  // ─── Data fetching ──────────────────────────────────────────────────────────

  const fetchImport = useCallback(async () => {
    const res = await fetch(`/api/admin/pdf-imports/${importId}`);
    if (res.ok) {
      const data = await res.json();
      setImportInfo(data.import);
    }
  }, [importId]);

  const fetchQuestions = useCallback(
    async (p = page) => {
      const res = await fetch(
        `/api/admin/pdf-imports/${importId}/questions?page=${p}&pageSize=${PAGE_SIZE}`
      );
      if (res.ok) {
        const data = await res.json();
        setQuestions(data.questions ?? []);
        setTotalQuestions(data.pagination?.total ?? 0);
      }
      setLoading(false);
    },
    [importId, page]
  );

  useEffect(() => {
    fetchImport();
    fetchQuestions();
  }, [fetchImport, fetchQuestions]);

  // Reset edited fields when selected question changes
  useEffect(() => {
    setEditedFields({});
  }, [selectedIdx]);

  // ─── Current question ───────────────────────────────────────────────────────

  const current = questions[selectedIdx] ?? null;

  const mergedQuestion: ExtractedQuestion | null = current
    ? { ...current, ...editedFields }
    : null;

  const setField = <K extends keyof ExtractedQuestion>(
    key: K,
    value: ExtractedQuestion[K]
  ) => {
    setEditedFields((prev) => ({ ...prev, [key]: value }));
  };

  // ─── Actions ────────────────────────────────────────────────────────────────

  const saveChanges = async () => {
    if (!current || Object.keys(editedFields).length === 0) return;
    setSaving(true);
    try {
      await fetch(`/api/admin/extracted-questions/${current.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editedFields),
      });
      // Apply edits to local state
      setQuestions((prev) =>
        prev.map((q, i) => (i === selectedIdx ? { ...q, ...editedFields } : q))
      );
      setEditedFields({});
    } finally {
      setSaving(false);
    }
  };

  const setReviewStatus = async (status: ReviewStatus) => {
    if (!current) return;
    setSaving(true);
    try {
      const allEdits = { ...editedFields, reviewStatus: status };
      await fetch(`/api/admin/extracted-questions/${current.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(allEdits),
      });
      setQuestions((prev) =>
        prev.map((q, i) =>
          i === selectedIdx ? { ...q, ...allEdits } : q
        )
      );
      setEditedFields({});
      // Auto-advance
      if (selectedIdx < questions.length - 1) {
        setSelectedIdx((i) => i + 1);
      }
    } finally {
      setSaving(false);
    }
  };

  const bulkApprove = async () => {
    const pending = questions.filter((q) => q.reviewStatus === "PENDING");
    if (pending.length === 0) return;
    setSaving(true);
    try {
      await Promise.all(
        pending.map((q) =>
          fetch(`/api/admin/extracted-questions/${q.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reviewStatus: "APPROVED" }),
          })
        )
      );
      await fetchQuestions();
    } finally {
      setSaving(false);
    }
  };

  const finalize = async () => {
    setFinalizing(true);
    setFinalizeResult(null);
    try {
      const res = await fetch(`/api/admin/pdf-imports/${importId}/finalize`, {
        method: "POST",
      });
      const data = await res.json();
      setFinalizeResult({
        message: data.message ?? data.error,
        errors: data.errors,
      });
    } finally {
      setFinalizing(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const pendingCount = questions.filter((q) => q.reviewStatus === "PENDING").length;
  const approvedCount = questions.filter((q) => q.reviewStatus === "APPROVED").length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold text-foreground">
            Review:{" "}
            <span className="gradient-text">
              {importInfo?.fileName ?? "Loading…"}
            </span>
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {totalQuestions} questions extracted · {approvedCount} approved ·{" "}
            {pendingCount} pending
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          {pendingCount > 0 && (
            <button
              onClick={bulkApprove}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
            >
              <FileCheck className="h-4 w-4" />
              Approve All Pending
            </button>
          )}
          <button
            onClick={finalize}
            disabled={finalizing || approvedCount === 0}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-brand hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {finalizing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <BookOpen className="h-4 w-4" />
            )}
            Finalize Import
          </button>
        </div>
      </div>

      {/* Progress Tracker */}
      {importInfo && importInfo.status === "PROCESSING" && (
        <ProgressTracker
          importId={importId}
          initialStatus={importInfo.status}
          initialProgress={importInfo.progressPercent}
          onComplete={fetchQuestions}
        />
      )}

      {/* Finalize Result */}
      {finalizeResult && (
        <div
          className={cn(
            "rounded-xl p-4 text-sm",
            finalizeResult.errors && finalizeResult.errors.length > 0
              ? "bg-warning/10 text-warning"
              : "bg-success/10 text-success"
          )}
        >
          <p className="font-semibold">{finalizeResult.message}</p>
          {finalizeResult.errors && finalizeResult.errors.length > 0 && (
            <ul className="mt-2 list-inside list-disc space-y-0.5 text-xs opacity-80">
              {finalizeResult.errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {questions.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card py-16 text-center">
          <AlertCircle className="h-10 w-10 text-muted-foreground" />
          <p className="font-medium text-foreground">No questions extracted yet</p>
          <p className="text-sm text-muted-foreground">
            The PDF is still being processed, or no questions were found.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-[280px_1fr] gap-5">
          {/* Left panel: Question List */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col">
            <div className="border-b border-border px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Questions ({questions.length})
            </div>
            <div className="flex-1 overflow-y-auto">
              {questions.map((q, idx) => (
                <button
                  key={q.id}
                  onClick={() => setSelectedIdx(idx)}
                  className={cn(
                    "w-full border-b border-border/50 px-4 py-3 text-left transition-colors hover:bg-muted/50",
                    idx === selectedIdx
                      ? "bg-primary/5 border-l-2 border-l-primary"
                      : ""
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground">
                      Q{q.questionNumber}
                    </span>
                    <StatusBadge status={q.reviewStatus} />
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {q.questionText}
                  </p>
                  <div className="mt-1.5">
                    <ConfidenceMeter value={q.extractionConfidence} />
                  </div>
                </button>
              ))}
            </div>
            {/* Pagination */}
            {totalQuestions > PAGE_SIZE && (
              <div className="border-t border-border p-3 flex items-center justify-between">
                <button
                  onClick={() => {
                    setPage((p) => p - 1);
                    fetchQuestions(page - 1);
                  }}
                  disabled={page === 1}
                  className="p-1 disabled:opacity-30 hover:text-primary transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-xs text-muted-foreground">
                  Page {page} of {Math.ceil(totalQuestions / PAGE_SIZE)}
                </span>
                <button
                  onClick={() => {
                    setPage((p) => p + 1);
                    fetchQuestions(page + 1);
                  }}
                  disabled={page >= Math.ceil(totalQuestions / PAGE_SIZE)}
                  className="p-1 disabled:opacity-30 hover:text-primary transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* Right panel: Editor */}
          {mergedQuestion ? (
            <div className="space-y-5">
              {/* Metadata row */}
              <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4">
                <div className="flex items-center gap-4 text-sm">
                  <span className="font-semibold text-foreground">
                    Q{mergedQuestion.questionNumber}
                  </span>
                  <StatusBadge status={mergedQuestion.reviewStatus} />
                  <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {mergedQuestion.questionType}
                  </span>
                  {mergedQuestion.containsDiagram && (
                    <span className="flex items-center gap-1 text-xs text-accent">
                      <ImageIcon className="h-3 w-3" />
                      Has Diagram
                    </span>
                  )}
                  {mergedQuestion.continued && (
                    <span className="text-xs text-warning">Continues →</span>
                  )}
                </div>
                <ConfidenceMeter value={mergedQuestion.extractionConfidence} />
              </div>

              {/* Diagram / Image */}
              {mergedQuestion.imageUrl && (
                <div className="overflow-hidden rounded-2xl border border-border bg-card p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Diagram / Image
                  </p>
                  <DiagramViewer
                    url={mergedQuestion.imageUrl}
                    pageNumber={mergedQuestion.pdfPage?.pageNumber}
                    questionNumber={mergedQuestion.questionNumber}
                  />
                </div>
              )}

              {/* Question editor */}
              <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
                {/* Question Text */}
                <div>
                  <label className="label-form mb-1.5">Question Text</label>
                  <textarea
                    value={mergedQuestion.questionText}
                    onChange={(e) => setField("questionText", e.target.value)}
                    rows={5}
                    className="input-form resize-y"
                  />
                </div>

                {/* Options (MCQ/MSQ) */}
                {(mergedQuestion.questionType === "MCQ" ||
                  mergedQuestion.questionType === "MSQ") &&
                  mergedQuestion.options && (
                    <div>
                      <label className="label-form mb-2">Options</label>
                      <div className="grid grid-cols-2 gap-3">
                        {["A", "B", "C", "D"].map((key) => (
                          <div key={key}>
                            <label className="mb-1 block text-xs font-medium text-muted-foreground">
                              Option {key}
                            </label>
                            <input
                              type="text"
                              value={
                                (mergedQuestion.options as Record<string, string>)?.[key] ?? ""
                              }
                              onChange={(e) => {
                                const opts = {
                                  ...mergedQuestion.options,
                                  [key]: e.target.value,
                                } as Record<string, string>;
                                setField("options", opts);
                              }}
                              className="input-form"
                              placeholder={`Option ${key}`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Answer */}
                <div>
                  <label className="label-form mb-1.5">Answer</label>
                  {mergedQuestion.questionType === "NAT" ? (
                    <input
                      type="text"
                      value={
                        typeof mergedQuestion.answer === "string" ||
                        typeof mergedQuestion.answer === "number"
                          ? String(mergedQuestion.answer)
                          : ""
                      }
                      onChange={(e) => setField("answer", e.target.value)}
                      className="input-form"
                      placeholder="Numerical answer (e.g. 42.5)"
                    />
                  ) : (
                    <div className="flex gap-2">
                      {["A", "B", "C", "D"].map((key) => {
                        const ans = mergedQuestion.answer;
                        const isSelected =
                          ans === key ||
                          (Array.isArray(ans) && ans.includes(key));
                        return (
                          <button
                            key={key}
                            onClick={() => {
                              if (mergedQuestion.questionType === "MCQ") {
                                setField("answer", isSelected ? null : key);
                              } else {
                                const current = Array.isArray(ans)
                                  ? [...ans]
                                  : [];
                                if (isSelected) {
                                  setField(
                                    "answer",
                                    current.filter((k) => k !== key)
                                  );
                                } else {
                                  setField("answer", [...current, key]);
                                }
                              }
                            }}
                            className={cn(
                              "h-9 w-9 rounded-lg border text-sm font-semibold transition-all",
                              isSelected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border text-muted-foreground hover:border-primary hover:text-primary"
                            )}
                          >
                            {key}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Meta fields */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="label-form mb-1.5">Subject</label>
                    <select
                      value={mergedQuestion.subject ?? ""}
                      onChange={(e) =>
                        setField("subject", e.target.value as Subject)
                      }
                      className="input-form"
                    >
                      <option value="">Select subject…</option>
                      {SUBJECTS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label-form mb-1.5">Topic</label>
                    <input
                      type="text"
                      value={mergedQuestion.topic ?? ""}
                      onChange={(e) => setField("topic", e.target.value)}
                      className="input-form"
                      placeholder="e.g. Sorting"
                    />
                  </div>
                  <div>
                    <label className="label-form mb-1.5">Year</label>
                    <input
                      type="number"
                      value={mergedQuestion.year ?? ""}
                      onChange={(e) =>
                        setField(
                          "year",
                          e.target.value ? parseInt(e.target.value) : null
                        )
                      }
                      className="input-form"
                      placeholder="2024"
                      min={2000}
                      max={2030}
                    />
                  </div>
                  <div>
                    <label className="label-form mb-1.5">Marks</label>
                    <select
                      value={mergedQuestion.marks ?? ""}
                      onChange={(e) =>
                        setField(
                          "marks",
                          e.target.value ? parseFloat(e.target.value) : null
                        )
                      }
                      className="input-form"
                    >
                      <option value="">Select…</option>
                      <option value="1">1 Mark</option>
                      <option value="2">2 Marks</option>
                    </select>
                  </div>
                  <div>
                    <label className="label-form mb-1.5">Difficulty</label>
                    <select
                      value={mergedQuestion.difficulty ?? ""}
                      onChange={(e) =>
                        setField("difficulty", e.target.value as Difficulty)
                      }
                      className="input-form"
                    >
                      <option value="">Select…</option>
                      <option value="EASY">Easy</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HARD">Hard</option>
                    </select>
                  </div>
                  <div>
                    <label className="label-form mb-1.5">Question Type</label>
                    <select
                      value={mergedQuestion.questionType}
                      onChange={(e) =>
                        setField("questionType", e.target.value as QuestionType)
                      }
                      className="input-form"
                    >
                      <option value="MCQ">MCQ</option>
                      <option value="MSQ">MSQ</option>
                      <option value="NAT">NAT</option>
                    </select>
                  </div>
                </div>

                {/* Explanation */}
                <div>
                  <label className="label-form mb-1.5">
                    Explanation{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      (optional)
                    </span>
                  </label>
                  <textarea
                    value={mergedQuestion.explanation ?? ""}
                    onChange={(e) => setField("explanation", e.target.value)}
                    rows={3}
                    className="input-form resize-y"
                    placeholder="Add explanation for this question…"
                  />
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-3 border-t border-border pt-4">
                  {Object.keys(editedFields).length > 0 && (
                    <button
                      onClick={saveChanges}
                      disabled={saving}
                      className="flex items-center gap-1.5 rounded-lg bg-muted px-4 py-2 text-sm font-medium hover:bg-muted/80 transition-colors disabled:opacity-50"
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Save Changes
                    </button>
                  )}
                  <button
                    onClick={() => setReviewStatus("APPROVED")}
                    disabled={saving || mergedQuestion.reviewStatus === "APPROVED"}
                    className="flex items-center gap-1.5 rounded-lg bg-success/10 px-4 py-2 text-sm font-semibold text-success hover:bg-success/20 transition-colors disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Approve
                  </button>
                  <button
                    onClick={() => setReviewStatus("REJECTED")}
                    disabled={saving || mergedQuestion.reviewStatus === "REJECTED"}
                    className="flex items-center gap-1.5 rounded-lg bg-destructive/10 px-4 py-2 text-sm font-semibold text-destructive hover:bg-destructive/20 transition-colors disabled:opacity-50"
                  >
                    <XCircle className="h-4 w-4" />
                    Reject
                  </button>
                  {/* Navigation */}
                  <div className="ml-auto flex gap-1">
                    <button
                      onClick={() => setSelectedIdx((i) => i - 1)}
                      disabled={selectedIdx === 0}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-muted disabled:opacity-30 transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setSelectedIdx((i) => i + 1)}
                      disabled={selectedIdx === questions.length - 1}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-muted disabled:opacity-30 transition-colors"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center rounded-2xl border border-border bg-card">
              <p className="text-muted-foreground">
                Select a question to review
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

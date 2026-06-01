"use client";

import { useState, useRef, useCallback } from "react";
import {
  Upload, FileText, X, CheckCircle2, AlertCircle, Loader2,
  Download, Trash2, Eye, EyeOff, ChevronDown, ChevronUp,
  Sparkles, Database, FileJson,
} from "lucide-react";
import { SUBJECT_META } from "@/types";
import { Subject } from "@prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ExtractedQuestion {
  subject: Subject;
  topic: string;
  year: number;
  marks: number;
  difficulty: string;
  questionType: string;
  questionText: string;
  options: { key: string; text: string }[] | null;
  answer: unknown;
  explanation: string | null;
  source: string | null;
  paperSet: string | null;
  tags: string[];
  isVerified: boolean;
}

interface SkippedItem { index: number; reason: string }

type Stage = "idle" | "extracting" | "preview" | "importing" | "done";

const DIFF_COLORS: Record<string, string> = {
  EASY:   "bg-green-500/10 text-green-600",
  MEDIUM: "bg-amber-500/10 text-amber-600",
  HARD:   "bg-red-500/10   text-red-500",
};
const TYPE_COLORS: Record<string, string> = {
  MCQ: "bg-blue-500/10 text-blue-600",
  MSQ: "bg-purple-500/10 text-purple-600",
  NAT: "bg-amber-500/10 text-amber-600",
};

// ─── JSON template download ───────────────────────────────────────────────────
const TEMPLATE: ExtractedQuestion[] = [
  {
    subject: "ALGORITHMS" as Subject,
    topic: "Sorting Algorithms",
    year: 2023,
    marks: 2,
    difficulty: "MEDIUM",
    questionType: "MCQ",
    questionText: "Which of the following sorting algorithms has the best worst-case time complexity?",
    options: [
      { key: "A", text: "Bubble Sort" },
      { key: "B", text: "Merge Sort" },
      { key: "C", text: "Quick Sort" },
      { key: "D", text: "Selection Sort" },
    ],
    answer: "B",
    explanation: "Merge Sort always runs in O(n log n) regardless of input.",
    source: "GATE CS 2023",
    paperSet: null,
    tags: ["sorting", "time-complexity"],
    isVerified: false,
  },
];

function downloadTemplate() {
  const blob = new Blob([JSON.stringify(TEMPLATE, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "gate_questions_template.json";
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Question Preview Row ─────────────────────────────────────────────────────
function QuestionRow({
  q, index, onRemove,
}: {
  q: ExtractedQuestion;
  index: number;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const meta = SUBJECT_META[q.subject] ?? { shortLabel: q.subject, color: "#888" };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Summary row */}
      <div className="flex items-start gap-3 px-4 py-3">
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground line-clamp-2">{q.questionText}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: `${meta.color}18`, color: meta.color }}>
              {meta.shortLabel}
            </span>
            <span className="text-[10px] text-muted-foreground">{q.topic}</span>
            <span className="text-[10px] text-muted-foreground">·</span>
            <span className="text-[10px] text-muted-foreground">{q.year}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${TYPE_COLORS[q.questionType] ?? ""}`}>
              {q.questionType}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${DIFF_COLORS[q.difficulty] ?? ""}`}>
              {q.difficulty.charAt(0) + q.difficulty.slice(1).toLowerCase()}
            </span>
            <span className="text-[10px] text-muted-foreground">{q.marks}M</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button onClick={() => setExpanded((v) => !v)} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors">
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          <button onClick={onRemove} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-colors">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-border bg-muted/30 px-4 py-3 space-y-2 text-xs">
          {q.options && (
            <div className="space-y-1">
              {q.options.map((o) => (
                <div key={o.key} className={`flex gap-2 ${String(q.answer) === o.key ? "font-semibold text-green-600" : "text-muted-foreground"}`}>
                  <span className="font-bold">{o.key}.</span>
                  <span>{o.text}</span>
                  {String(q.answer) === o.key && <span className="text-green-600">← correct</span>}
                </div>
              ))}
            </div>
          )}
          {q.questionType === "NAT" && (
            <p className="text-muted-foreground">Answer: <span className="font-semibold text-foreground">{String(q.answer)}</span></p>
          )}
          {q.explanation && (
            <p className="text-muted-foreground italic">{q.explanation}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function BulkImportModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [stage, setStage]           = useState<Stage>("idle");
  const [questions, setQuestions]   = useState<ExtractedQuestion[]>([]);
  const [skipped, setSkipped]       = useState<SkippedItem[]>([]);
  const [error, setError]           = useState("");
  const [importResult, setImportResult] = useState<{ created: number } | null>(null);
  const [showSkipped, setShowSkipped] = useState(false);
  const [dragOver, setDragOver]     = useState(false);
  const [fileName, setFileName]     = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const jsonRef = useRef<HTMLInputElement>(null);

  // ── PDF upload → Gemini extraction ────────────────────────────────────────
  const handlePDF = useCallback(async (file: File) => {
    setError("");
    setFileName(file.name);
    setStage("extracting");

    const form = new FormData();
    form.append("pdf", file);

    try {
      const res = await fetch("/api/admin/import/pdf", { method: "POST", body: form });
      const data = await res.json();

      if (!res.ok) { setError(data.error ?? "Extraction failed"); setStage("idle"); return; }

      setQuestions(data.extracted);
      setSkipped(data.skipped ?? []);
      setStage("preview");
    } catch {
      setError("Network error during extraction");
      setStage("idle");
    }
  }, []);

  // ── JSON upload ───────────────────────────────────────────────────────────
  const handleJSON = useCallback(async (file: File) => {
    setError("");
    setFileName(file.name);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      setQuestions(arr);
      setSkipped([]);
      setStage("preview");
    } catch {
      setError("Invalid JSON file. Download the template to see the required format.");
    }
  }, []);

  const handleFile = (file: File) => {
    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) handlePDF(file);
    else if (file.type === "application/json" || file.name.endsWith(".json")) handleJSON(file);
    else setError("Only PDF and JSON files are supported.");
  };

  // ── Import to DB ──────────────────────────────────────────────────────────
  const handleImport = async () => {
    setStage("importing");
    setError("");
    try {
      const res = await fetch("/api/questions/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Import failed"); setStage("preview"); return; }
      setImportResult({ created: data.created });
      setStage("done");
      onImported();
    } catch {
      setError("Network error during import");
      setStage("preview");
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8 px-4">
        <div className="w-full max-w-3xl animate-fade-up rounded-2xl border border-border bg-card shadow-2xl">

          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-brand">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">Bulk Import Questions</h2>
                <p className="text-xs text-muted-foreground">Upload a GATE PDF — Gemini AI extracts all questions automatically</p>
              </div>
            </div>
            <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-6 space-y-5">
            {/* ── Error banner ── */}
            {error && (
              <div className="flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}
              </div>
            )}

            {/* ── IDLE: upload zone ── */}
            {stage === "idle" && (
              <div className="space-y-4">
                {/* Drop zone */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                  onClick={() => fileRef.current?.click()}
                  className={`flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-10 transition-all ${
                    dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/30"
                  }`}
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl gradient-brand shadow-brand">
                    <Upload className="h-8 w-8 text-white" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-foreground">Drop your GATE PDF here</p>
                    <p className="mt-1 text-xs text-muted-foreground">or click to browse · PDF up to 20 MB</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> PDF</span>
                    <span className="text-border">·</span>
                    <span className="flex items-center gap-1"><FileJson className="h-3.5 w-3.5" /> JSON</span>
                  </div>
                </div>
                <input ref={fileRef} type="file" accept=".pdf,.json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

                {/* How it works */}
                <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
                  <p className="text-xs font-semibold text-foreground">How it works</p>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { step: "1", text: "Upload official GATE paper PDF" },
                      { step: "2", text: "Gemini AI reads & extracts all questions" },
                      { step: "3", text: "Review, remove errors, then import" },
                    ].map((s) => (
                      <div key={s.step} className="flex flex-col items-center gap-2 text-center">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full gradient-brand text-xs font-bold text-white">{s.step}</span>
                        <span className="text-[11px] text-muted-foreground">{s.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* JSON template */}
                <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
                  <div className="flex items-center gap-2.5 text-sm">
                    <FileJson className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-foreground">Have structured data?</span>
                    <span className="text-muted-foreground">Use the JSON template instead</span>
                  </div>
                  <button onClick={downloadTemplate} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors">
                    <Download className="h-3.5 w-3.5" />
                    Template
                  </button>
                </div>
              </div>
            )}

            {/* ── EXTRACTING ── */}
            {stage === "extracting" && (
              <div className="flex flex-col items-center justify-center gap-5 py-16">
                <div className="relative">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl gradient-brand shadow-brand">
                    <Sparkles className="h-10 w-10 text-white" />
                  </div>
                  <Loader2 className="absolute -right-1 -top-1 h-6 w-6 animate-spin text-primary" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-foreground">Gemini is reading your PDF…</p>
                  <p className="mt-1 text-xs text-muted-foreground">{fileName}</p>
                  <p className="mt-2 text-xs text-muted-foreground">This may take 10–30 seconds depending on the number of pages</p>
                </div>
              </div>
            )}

            {/* ── PREVIEW ── */}
            {(stage === "preview" || stage === "importing") && (
              <div className="space-y-4">
                {/* Summary bar */}
                <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium text-foreground">{fileName}</span>
                  <span className="ml-auto flex items-center gap-1 text-xs font-semibold text-green-600">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {questions.length} questions ready
                  </span>
                  {skipped.length > 0 && (
                    <button onClick={() => setShowSkipped((v) => !v)} className="flex items-center gap-1 text-xs text-amber-600">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {skipped.length} skipped
                    </button>
                  )}
                  <button onClick={() => { setStage("idle"); setQuestions([]); setSkipped([]); }} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                    Change file
                  </button>
                </div>

                {/* Skipped items */}
                {showSkipped && skipped.length > 0 && (
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 space-y-1">
                    <p className="text-xs font-semibold text-amber-600">Skipped (could not parse):</p>
                    {skipped.slice(0, 10).map((s) => (
                      <p key={s.index} className="text-xs text-muted-foreground">• Item {s.index + 1}: {s.reason}</p>
                    ))}
                  </div>
                )}

                {/* Question list */}
                <div className="max-h-[380px] space-y-2 overflow-y-auto pr-1">
                  {questions.map((q, i) => (
                    <QuestionRow
                      key={i}
                      q={q}
                      index={i}
                      onRemove={() => setQuestions((prev) => prev.filter((_, idx) => idx !== i))}
                    />
                  ))}
                  {questions.length === 0 && (
                    <p className="py-8 text-center text-sm text-muted-foreground">All questions removed.</p>
                  )}
                </div>

                {/* Import button */}
                <div className="flex gap-3 pt-2">
                  <button onClick={onClose} className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors">
                    Cancel
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={questions.length === 0 || stage === "importing"}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl gradient-brand py-2.5 text-sm font-semibold text-white shadow-brand hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                  >
                    {stage === "importing" ? (
                      <><Loader2 className="h-4 w-4 animate-spin" />Importing…</>
                    ) : (
                      <><Database className="h-4 w-4" />Import {questions.length} Questions</>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* ── DONE ── */}
            {stage === "done" && importResult && (
              <div className="flex flex-col items-center justify-center gap-5 py-12 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-green-500/10">
                  <CheckCircle2 className="h-10 w-10 text-green-500" />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">{importResult.created} Questions Imported!</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    They are now in the database. Mark them as <strong>Verified</strong> in the question table to make them available in Practice Mode.
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="rounded-xl gradient-brand px-6 py-2.5 text-sm font-semibold text-white shadow-brand hover:opacity-90 transition-all"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

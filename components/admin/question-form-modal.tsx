"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreateQuestionSchema, type CreateQuestionInput } from "@/lib/schemas/question";
import { SUBJECT_META } from "@/types";
import { Subject, Difficulty, QuestionType } from "@prisma/client";
import {
  X,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Plus,
  Trash2,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const OPTION_KEYS = ["A", "B", "C", "D"] as const;

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 1990 + 1 }, (_, i) => CURRENT_YEAR - i);

const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  EASY: "text-green-600",
  MEDIUM: "text-amber-600",
  HARD: "text-red-600",
};

// ─── Form data shape (flattened for RHF) ──────────────────────────────────────
interface QuestionFormData {
  subject: Subject;
  topic: string;
  year: number;
  marks: number;
  difficulty: Difficulty;
  questionType: QuestionType;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  answerMCQ: string;
  answerMSQ: string[];
  answerNAT: string;
  explanation: string;
  imageUrl: string;
  tagsRaw: string;
  source: string;
  paperSet: string;
  isVerified: boolean;
}

const EMPTY_FORM: QuestionFormData = {
  subject: Subject.ALGORITHMS,
  topic: "",
  year: CURRENT_YEAR,
  marks: 1,
  difficulty: Difficulty.MEDIUM,
  questionType: QuestionType.MCQ,
  questionText: "",
  optionA: "",
  optionB: "",
  optionC: "",
  optionD: "",
  answerMCQ: "A",
  answerMSQ: [],
  answerNAT: "",
  explanation: "",
  imageUrl: "",
  tagsRaw: "",
  source: "",
  paperSet: "",
  isVerified: false,
};

// ─── Props ────────────────────────────────────────────────────────────────────
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
}

interface QuestionFormModalProps {
  mode: "add" | "edit";
  question?: Question;
  onClose: () => void;
  onSaved: () => void;
}

// ─── Convert DB question → form fields ────────────────────────────────────────
function questionToForm(q: Question): QuestionFormData {
  const opts = q.options ?? [];
  const getOpt = (key: string) => opts.find((o) => o.key === key)?.text ?? "";

  let answerMCQ = "A";
  let answerMSQ: string[] = [];
  let answerNAT = "";

  if (q.questionType === "MCQ") answerMCQ = String(q.answer);
  else if (q.questionType === "MSQ")
    answerMSQ = Array.isArray(q.answer) ? (q.answer as string[]) : [];
  else answerNAT = String(q.answer);

  return {
    subject: q.subject,
    topic: q.topic,
    year: q.year,
    marks: q.marks,
    difficulty: q.difficulty,
    questionType: q.questionType,
    questionText: q.questionText,
    optionA: getOpt("A"),
    optionB: getOpt("B"),
    optionC: getOpt("C"),
    optionD: getOpt("D"),
    answerMCQ,
    answerMSQ,
    answerNAT,
    explanation: q.explanation ?? "",
    imageUrl: q.imageUrl ?? "",
    tagsRaw: q.tags.join(", "),
    source: q.source ?? "",
    paperSet: q.paperSet ?? "",
    isVerified: q.isVerified,
  };
}

// ─── Convert form fields → API payload ───────────────────────────────────────
function formToPayload(data: QuestionFormData): CreateQuestionInput {
  const options =
    data.questionType !== "NAT"
      ? OPTION_KEYS.map((key) => ({
          key,
          text: data[`option${key}` as keyof QuestionFormData] as string,
        })).filter((o) => o.text.trim())
      : undefined;

  const answer: unknown =
    data.questionType === "MCQ"
      ? data.answerMCQ
      : data.questionType === "MSQ"
      ? data.answerMSQ
      : parseFloat(data.answerNAT);

  return {
    subject: data.subject,
    topic: data.topic.trim(),
    year: Number(data.year),
    marks: Number(data.marks) as 1 | 2,
    difficulty: data.difficulty,
    questionType: data.questionType,
    questionText: data.questionText.trim(),
    options,
    answer: answer as string,
    explanation: data.explanation.trim() || undefined,
    imageUrl: data.imageUrl.trim() || undefined,
    tags: data.tagsRaw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    source: data.source.trim() || undefined,
    paperSet: data.paperSet.trim() || undefined,
    isVerified: data.isVerified,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────
export function QuestionFormModal({
  mode,
  question,
  onClose,
  onSaved,
}: QuestionFormModalProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<QuestionFormData>({
    defaultValues: mode === "edit" && question ? questionToForm(question) : EMPTY_FORM,
  });

  const questionType = watch("questionType");
  const answerMSQ = watch("answerMSQ");

  // Reset answer fields when questionType changes
  useEffect(() => {
    setValue("answerMCQ", "A");
    setValue("answerMSQ", []);
    setValue("answerNAT", "");
  }, [questionType, setValue]);

  const [submitError, setSubmitError] = useState("");

  const onSubmit = async (data: QuestionFormData) => {
    setSubmitError("");
    const payload = formToPayload(data);

    const url = mode === "edit" ? `/api/questions/${question!.id}` : "/api/questions";
    const method = mode === "edit" ? "PATCH" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        setSubmitError(json.error ?? "Something went wrong");
        return;
      }

      onSaved();
      onClose();
    } catch {
      setSubmitError("Network error. Please try again.");
    }
  };

  // MSQ checkbox toggle
  const toggleMSQ = (key: string) => {
    const current = answerMSQ ?? [];
    const next = current.includes(key)
      ? current.filter((k) => k !== key)
      : [...current, key];
    setValue("answerMSQ", next);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal panel */}
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8 px-4">
        <div className="w-full max-w-2xl animate-fade-up rounded-2xl border border-border bg-card shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div>
              <h2 className="text-base font-bold text-foreground">
                {mode === "add" ? "Add New Question" : "Edit Question"}
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Fields marked <span className="text-destructive">*</span> are required
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
            {/* ── Section 1: Classification ── */}
            <section className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Classification
              </h3>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {/* Subject */}
                <div className="col-span-2 sm:col-span-1 space-y-1.5">
                  <label className="label-form">Subject <span className="text-destructive">*</span></label>
                  <select {...register("subject")} className="input-form">
                    {Object.entries(SUBJECT_META).map(([k, m]) => (
                      <option key={k} value={k}>{m.label}</option>
                    ))}
                  </select>
                </div>

                {/* Topic */}
                <div className="col-span-2 space-y-1.5">
                  <label className="label-form">Topic <span className="text-destructive">*</span></label>
                  <input
                    {...register("topic")}
                    placeholder="e.g. Sorting Algorithms"
                    className="input-form"
                  />
                  {errors.topic && <p className="form-error">{errors.topic.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {/* Year */}
                <div className="space-y-1.5">
                  <label className="label-form">Year <span className="text-destructive">*</span></label>
                  <select {...register("year", { valueAsNumber: true })} className="input-form">
                    {YEARS.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>

                {/* Marks */}
                <div className="space-y-1.5">
                  <label className="label-form">Marks <span className="text-destructive">*</span></label>
                  <select {...register("marks", { valueAsNumber: true })} className="input-form">
                    <option value={1}>1 mark</option>
                    <option value={2}>2 marks</option>
                  </select>
                </div>

                {/* Difficulty */}
                <div className="space-y-1.5">
                  <label className="label-form">Difficulty <span className="text-destructive">*</span></label>
                  <select {...register("difficulty")} className="input-form">
                    {Object.values(Difficulty).map((d) => (
                      <option key={d} value={d}>{d.charAt(0) + d.slice(1).toLowerCase()}</option>
                    ))}
                  </select>
                </div>

                {/* Type */}
                <div className="space-y-1.5">
                  <label className="label-form">Type <span className="text-destructive">*</span></label>
                  <select {...register("questionType")} className="input-form">
                    <option value="MCQ">MCQ</option>
                    <option value="MSQ">MSQ</option>
                    <option value="NAT">NAT</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="label-form">Source</label>
                  <input {...register("source")} placeholder="e.g. GATE CS 2024" className="input-form" />
                </div>
                <div className="space-y-1.5">
                  <label className="label-form">Paper Set</label>
                  <input {...register("paperSet")} placeholder="e.g. Set 1" className="input-form" />
                </div>
              </div>
            </section>

            <div className="border-t border-border" />

            {/* ── Section 2: Question Content ── */}
            <section className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Question Content
              </h3>

              <div className="space-y-1.5">
                <label className="label-form">Question Text <span className="text-destructive">*</span></label>
                <textarea
                  {...register("questionText")}
                  rows={4}
                  placeholder="Write the question here…"
                  className="input-form resize-none"
                />
                {errors.questionText && <p className="form-error">{errors.questionText.message}</p>}
              </div>

              {/* Options — only for MCQ / MSQ */}
              {questionType !== "NAT" && (
                <div className="space-y-2">
                  <label className="label-form">
                    Options <span className="text-destructive">*</span>
                    <span className="ml-1.5 font-normal text-muted-foreground">
                      ({questionType === "MCQ" ? "single correct" : "multiple correct"})
                    </span>
                  </label>
                  <div className="space-y-2">
                    {OPTION_KEYS.map((key) => (
                      <div key={key} className="flex items-center gap-2.5">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-xs font-bold text-muted-foreground">
                          {key}
                        </span>
                        <input
                          {...register(`option${key}` as keyof QuestionFormData)}
                          placeholder={`Option ${key}`}
                          className="input-form flex-1"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <div className="border-t border-border" />

            {/* ── Section 3: Answer ── */}
            <section className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Correct Answer
              </h3>

              {questionType === "MCQ" && (
                <div className="flex flex-wrap gap-3">
                  {OPTION_KEYS.map((key) => (
                    <label key={key} className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        value={key}
                        {...register("answerMCQ")}
                        className="accent-primary"
                      />
                      <span className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-muted text-xs font-bold">
                        {key}
                      </span>
                    </label>
                  ))}
                </div>
              )}

              {questionType === "MSQ" && (
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">Select all correct options</p>
                  <div className="flex flex-wrap gap-3">
                    {OPTION_KEYS.map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleMSQ(key)}
                        className={`flex h-9 w-9 items-center justify-center rounded-lg border-2 text-sm font-bold transition-all ${
                          answerMSQ?.includes(key)
                            ? "border-primary bg-primary/15 text-primary"
                            : "border-border bg-muted text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        {key}
                      </button>
                    ))}
                  </div>
                  {answerMSQ?.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Selected: <span className="font-semibold text-foreground">{answerMSQ.join(", ")}</span>
                    </p>
                  )}
                </div>
              )}

              {questionType === "NAT" && (
                <div className="space-y-1.5">
                  <label className="label-form">Numeric Answer <span className="text-destructive">*</span></label>
                  <input
                    {...register("answerNAT")}
                    type="number"
                    step="any"
                    placeholder="e.g. 42 or 3.14"
                    className="input-form max-w-xs"
                  />
                  <p className="text-xs text-muted-foreground">
                    Evaluation uses ±0.5% tolerance for floating-point answers.
                  </p>
                </div>
              )}
            </section>

            <div className="border-t border-border" />

            {/* ── Section 4: Explanation & Meta ── */}
            <section className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Additional Info
              </h3>

              <div className="space-y-1.5">
                <label className="label-form">Explanation</label>
                <textarea
                  {...register("explanation")}
                  rows={3}
                  placeholder="Explain the correct answer (shown after submission)…"
                  className="input-form resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="label-form">Image URL</label>
                  <input
                    {...register("imageUrl")}
                    placeholder="https://..."
                    className="input-form"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="label-form">Tags</label>
                  <input
                    {...register("tagsRaw")}
                    placeholder="sorting, graph, dp (comma-separated)"
                    className="input-form"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <input
                  id="isVerified"
                  type="checkbox"
                  {...register("isVerified")}
                  className="h-4 w-4 accent-primary rounded"
                />
                <label htmlFor="isVerified" className="text-sm font-medium text-foreground cursor-pointer">
                  Mark as verified
                </label>
                <span className="text-xs text-muted-foreground">(only verified questions appear in practice mode)</span>
              </div>
            </section>

            {/* Error */}
            {submitError && (
              <div className="flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {submitError}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-lg border border-border bg-background py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg gradient-brand py-2.5 text-sm font-semibold text-white shadow-brand hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
              >
                {isSubmitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
                ) : (
                  <><CheckCircle2 className="h-4 w-4" /> {mode === "add" ? "Add Question" : "Save Changes"}</>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}



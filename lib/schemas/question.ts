import { z } from "zod";
import { Subject, Difficulty, QuestionType } from "@prisma/client";

// ─── Option shape for MCQ/MSQ ──────────────────────────────────────────────────
export const OptionSchema = z.object({
  key:  z.enum(["A", "B", "C", "D"]),
  text: z.string().min(1),
});

// ─── Base object (no refinements — required so .partial() works) ──────────────
const QuestionBaseSchema = z.object({
  subject:      z.nativeEnum(Subject),
  topic:        z.string().min(1, "Topic is required"),
  year:         z.number().int().min(1990).max(new Date().getFullYear() + 1),
  marks:        z.number().refine((v) => v === 1 || v === 2, { message: "Marks must be 1 or 2" }),
  difficulty:   z.nativeEnum(Difficulty),
  questionType: z.nativeEnum(QuestionType),
  questionText: z.string().min(5, "Question text is required"),
  options:      z.array(OptionSchema).min(2).max(4).optional(),
  answer:       z.union([
    z.string(),          // MCQ: "A"
    z.array(z.string()), // MSQ: ["A","C"]
    z.number(),          // NAT: 42.5
  ]),
  explanation: z.string().optional(),
  imageUrl:    z.string().url().optional().or(z.literal("")),
  imageDescription: z.string().optional(), // Gemini-generated diagram text
  tags:        z.array(z.string()).default([]),
  source:      z.string().optional(),
  paperSet:    z.string().optional(),
  isVerified:  z.boolean().default(false),
});

// ─── Cross-field validation applied only to Create ───────────────────────────
function applyQuestionRefinements<T extends typeof QuestionBaseSchema>(schema: T) {
  return schema.superRefine((data, ctx) => {
    if (
      (data.questionType === "MCQ" || data.questionType === "MSQ") &&
      (!data.options || data.options.length < 2)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "MCQ/MSQ questions must have at least 2 options",
        path: ["options"],
      });
    }
    if (data.questionType === "NAT" && typeof data.answer !== "number") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "NAT questions must have a numeric answer",
        path: ["answer"],
      });
    }
    if (data.questionType === "MCQ" && typeof data.answer !== "string") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "MCQ questions must have a single string answer (e.g. 'A')",
        path: ["answer"],
      });
    }
    if (data.questionType === "MSQ" && !Array.isArray(data.answer)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "MSQ questions must have an array answer (e.g. ['A','C'])",
        path: ["answer"],
      });
    }
  });
}

// ─── Create — full validation with cross-field refinements ────────────────────
export const CreateQuestionSchema = applyQuestionRefinements(QuestionBaseSchema);

// ─── Update — all fields optional, no cross-field refinements needed ──────────
// .partial() requires no superRefine on the schema being partialised
export const UpdateQuestionSchema = QuestionBaseSchema.partial();

// ─── List / filter query params ───────────────────────────────────────────────
export const QuestionFilterSchema = z.object({
  subject:      z.nativeEnum(Subject).optional(),
  topic:        z.string().optional(),
  year:         z.coerce.number().int().optional(),
  difficulty:   z.nativeEnum(Difficulty).optional(),
  questionType: z.nativeEnum(QuestionType).optional(),
  isVerified:   z.coerce.boolean().optional(),
  search:       z.string().optional(),
  page:         z.coerce.number().int().min(1).default(1),
  limit:        z.coerce.number().int().min(1).max(100).default(20),
  sortBy:       z.enum(["year", "createdAt", "difficulty", "marks"]).default("year"),
  sortOrder:    z.enum(["asc", "desc"]).default("desc"),
});

export type CreateQuestionInput = z.infer<typeof CreateQuestionSchema>;
export type UpdateQuestionInput = z.infer<typeof UpdateQuestionSchema>;
export type QuestionFilter      = z.infer<typeof QuestionFilterSchema>;

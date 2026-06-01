import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Subject, Difficulty, QuestionType } from "@prisma/client";

const AttemptSchema = z.object({
  selectedAnswer: z.union([
    z.string(),
    z.array(z.string()),
    z.number(),
  ]),
  timeTaken: z.number().int().min(0), // seconds
});

/**
 * POST /api/questions/[id]/attempt
 * Submit an answer, evaluate correctness, persist QuestionAttempt,
 * and update denormalized counters on the Question.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const question = await prisma.question.findFirst({
    where: { id, deletedAt: null },
  });
  if (!question) {
    return Response.json({ error: "Question not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = AttemptSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { selectedAnswer, timeTaken } = parsed.data;

  // ── Evaluate correctness ────────────────────────────────────────────────────
  let isCorrect = false;
  const correctAnswer = question.answer;

  if (question.questionType === "MCQ") {
    isCorrect = selectedAnswer === correctAnswer;
  } else if (question.questionType === "MSQ") {
    const selected = Array.isArray(selectedAnswer)
      ? [...selectedAnswer].sort()
      : [];
    const correct = Array.isArray(correctAnswer)
      ? [...(correctAnswer as string[])].sort()
      : [];
    isCorrect = JSON.stringify(selected) === JSON.stringify(correct);
  } else if (question.questionType === "NAT") {
    // Allow ±0.5% tolerance for floating point
    const selected = Number(selectedAnswer);
    const correct = Number(correctAnswer);
    const tolerance = Math.abs(correct) * 0.005 || 0.01;
    isCorrect = Math.abs(selected - correct) <= tolerance;
  }

  // ── Marks calculation ────────────────────────────────────────────────────────
  // GATE marking: +marks for correct, -1/3 marks for wrong MCQ, 0 for NAT/MSQ wrong
  const marksAwarded = isCorrect
    ? question.marks
    : question.questionType === "MCQ"
    ? -(question.marks / 3)
    : 0;

  // ── Persist attempt + update counters atomically ───────────────────────────
  const newTotal = question.totalAttempts + 1;
  const newCorrect = question.correctAttempts + (isCorrect ? 1 : 0);
  const newAvgTime =
    (question.avgTimeTaken * question.totalAttempts + timeTaken) / newTotal;

  const [attempt] = await prisma.$transaction([
    prisma.questionAttempt.create({
      data: {
        userId: session.user!.id as string,
        questionId: id,
        selectedAnswer: selectedAnswer as never,
        isCorrect,
        marksAwarded,
        timeTaken,
        subject: question.subject,
        topic: question.topic,
      },
    }),
    prisma.question.update({
      where: { id },
      data: {
        totalAttempts: newTotal,
        correctAttempts: newCorrect,
        avgTimeTaken: newAvgTime,
      },
    }),
  ]);

  return Response.json({
    attempt,
    result: {
      isCorrect,
      marksAwarded,
      correctAnswer: question.answer,
      explanation: question.explanation,
    },
  });
}

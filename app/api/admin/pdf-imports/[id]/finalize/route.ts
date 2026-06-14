import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export const maxDuration = 30;

// POST /api/admin/pdf-imports/[id]/finalize
// Creates Question records from all APPROVED ExtractedQuestions
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const pdfImport = await prisma.pdfImport.findUnique({ where: { id } });
    if (!pdfImport) {
      return Response.json({ error: "Import not found" }, { status: 404 });
    }

    // Get all approved questions that haven't been imported yet
    const approvedQuestions = await prisma.extractedQuestion.findMany({
      where: {
        pdfImportId: id,
        reviewStatus: "APPROVED",
        importedQuestionId: null, // not yet imported
      },
      orderBy: { questionNumber: "asc" },
    });

    if (approvedQuestions.length === 0) {
      return Response.json(
        { error: "No approved questions to import" },
        { status: 400 }
      );
    }

    // Validate required fields
    const invalidQuestions = approvedQuestions.filter(
      (q) => !q.subject || !q.topic || !q.year || !q.marks || !q.difficulty || !q.answer
    );

    if (invalidQuestions.length > 0) {
      return Response.json(
        {
          error: `${invalidQuestions.length} question(s) are missing required fields (subject, topic, year, marks, difficulty, answer). Please review them first.`,
          invalidIds: invalidQuestions.map((q) => q.id),
        },
        { status: 400 }
      );
    }

    let importedCount = 0;
    const errors: string[] = [];

    // Use Prisma transactions in batches of 10
    const batches: (typeof approvedQuestions)[] = [];
    for (let i = 0; i < approvedQuestions.length; i += 10) {
      batches.push(approvedQuestions.slice(i, i + 10));
    }

    for (const batch of batches) {
      await prisma.$transaction(async (tx) => {
        for (const eq of batch) {
          try {
            // Duplicate detection: check by year + questionNumber + subject
            const existing = await tx.question.findFirst({
              where: {
                year: eq.year!,
                subject: eq.subject!,
                source: `GATE ${eq.subject} ${eq.year}`,
                // Use questionText similarity as additional check
                questionText: { equals: eq.questionText },
              },
            });

            if (existing) {
              console.warn(
                `[finalize] Duplicate detected for Q${eq.questionNumber}, skipping`
              );
              errors.push(
                `Q${eq.questionNumber}: duplicate detected, skipped`
              );
              continue;
            }

            const question = await tx.question.create({
              data: {
                subject: eq.subject!,
                topic: eq.topic!,
                year: eq.year!,
                marks: eq.marks!,
                difficulty: eq.difficulty!,
                questionType: eq.questionType,
                questionText: eq.questionText,
                options: eq.options ?? undefined,
                answer: eq.answer!,
                explanation: eq.explanation ?? undefined,
                imageUrl: eq.imageUrl ?? undefined,
                source: `GATE ${eq.subject} ${eq.year}`,
                isVerified: false,
                tags: [],
              },
            });

            // Mark the extracted question as imported
            await tx.extractedQuestion.update({
              where: { id: eq.id },
              data: {
                importedQuestionId: question.id,
                importedAt: new Date(),
              },
            });

            importedCount++;
          } catch (err) {
            console.error(
              `[finalize] Failed to import Q${eq.questionNumber}:`,
              err
            );
            errors.push(
              `Q${eq.questionNumber}: ${err instanceof Error ? err.message : "unknown error"}`
            );
          }
        }
      });
    }

    return Response.json({
      message: `Successfully imported ${importedCount} question(s)`,
      importedCount,
      errors,
    });
  } catch (error) {
    console.error("[finalize POST]", error);
    return Response.json(
      { error: "Failed to finalize import" },
      { status: 500 }
    );
  }
}

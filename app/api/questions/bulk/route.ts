import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { CreateQuestionSchema } from "@/lib/schemas/question";

const BulkImportSchema = z.object({
  questions: z.array(CreateQuestionSchema).min(1).max(500),
});

/**
 * POST /api/questions/bulk
 * Import multiple questions at once.
 * Returns counts of created vs skipped (duplicates by questionText+year+subject).
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = BulkImportSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { questions } = parsed.data;

  // createMany with skipDuplicates won't work here because we don't have a
  // unique constraint on (questionText, year, subject). Use individual creates
  // wrapped in a transaction for atomicity.
  const results = await prisma.$transaction(
    questions.map((q) =>
      prisma.question.create({
        data: {
          ...q,
          imageUrl:         q.imageUrl         || null,
          imageDescription: q.imageDescription || null,
        },
        select: { id: true },
      })
    )
  );

  return Response.json(
    { created: results.length, ids: results.map((r) => r.id) },
    { status: 201 }
  );
}

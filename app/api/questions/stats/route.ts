import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Subject } from "@prisma/client";

/**
 * GET /api/questions/stats
 * Returns aggregate stats useful for the PYQ browser UI:
 * - total question count
 * - count per subject
 * - count per year
 * - count per difficulty
 * - count per question type
 * - distinct topics per subject
 */
export async function GET(_request: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const [
    total,
    bySubject,
    byYear,
    byDifficulty,
    byType,
  ] = await Promise.all([
    prisma.question.count({ where: { deletedAt: null } }),

    prisma.question.groupBy({
      by: ["subject"],
      where: { deletedAt: null },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    }),

    prisma.question.groupBy({
      by: ["year"],
      where: { deletedAt: null },
      _count: { id: true },
      orderBy: { year: "desc" },
    }),

    prisma.question.groupBy({
      by: ["difficulty"],
      where: { deletedAt: null },
      _count: { id: true },
    }),

    prisma.question.groupBy({
      by: ["questionType"],
      where: { deletedAt: null },
      _count: { id: true },
    }),
  ]);

  return Response.json({
    total,
    bySubject: bySubject.map((r) => ({
      subject: r.subject,
      count: r._count.id,
    })),
    byYear: byYear.map((r) => ({
      year: r.year,
      count: r._count.id,
    })),
    byDifficulty: byDifficulty.map((r) => ({
      difficulty: r.difficulty,
      count: r._count.id,
    })),
    byType: byType.map((r) => ({
      type: r.questionType,
      count: r._count.id,
    })),
  });
}

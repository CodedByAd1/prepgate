import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/analytics
 *
 * Returns the full analytics payload for the current user:
 * - overview  (totals, accuracy, marks, streak)
 * - daily     (last 30 days – one row per day)
 * - subjects  (grouped by Subject enum)
 * - topics    (top 20 topics by attempt count)
 */
export async function GET() {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user!.id as string;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // ── Run all queries in parallel ────────────────────────────────────────────
  const [
    overviewAgg,
    subjectGroups,
    topicGroups,
    dailyRaw,
    streakRaw,
  ] = await Promise.all([
    // Overall stats
    prisma.questionAttempt.aggregate({
      where: { userId },
      _count: { id: true },
      _sum:   { marksAwarded: true, timeTaken: true },
      _avg:   { timeTaken: true },
    }),

    // Subject-wise groupBy
    prisma.questionAttempt.groupBy({
      by: ["subject"],
      where: { userId },
      _count: { id: true },
      _sum:   { marksAwarded: true },
      orderBy: { _count: { id: "desc" } },
    }),

    // Topic-wise groupBy
    prisma.questionAttempt.groupBy({
      by: ["subject", "topic"],
      where: { userId },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 20,
    }),

    // Daily counts for last 30 days (raw SQL for date truncation)
    prisma.$queryRaw<
      Array<{ date: Date; total: bigint; correct: bigint }>
    >`
      SELECT
        DATE_TRUNC('day', "attemptedAt") AS date,
        COUNT(*)::bigint                 AS total,
        SUM(CASE WHEN "isCorrect" THEN 1 ELSE 0 END)::bigint AS correct
      FROM question_attempts
      WHERE "userId" = ${userId}
        AND "attemptedAt" >= ${thirtyDaysAgo}
      GROUP BY DATE_TRUNC('day', "attemptedAt")
      ORDER BY date ASC
    `,

    // Distinct days for streak (last 60 days, descending)
    prisma.$queryRaw<Array<{ date: Date }>>`
      SELECT DISTINCT DATE_TRUNC('day', "attemptedAt") AS date
      FROM question_attempts
      WHERE "userId" = ${userId}
      ORDER BY date DESC
      LIMIT 60
    `,

  ]);

  // ── Correct counts (groupBy can't give us this in one shot) ───────────────
  const [correctTotal, subjectCorrect, topicCorrect] = await Promise.all([
    prisma.questionAttempt.count({ where: { userId, isCorrect: true } }),

    prisma.questionAttempt.groupBy({
      by: ["subject"],
      where: { userId, isCorrect: true },
      _count: { id: true },
    }),

    prisma.questionAttempt.groupBy({
      by: ["subject", "topic"],
      where: { userId, isCorrect: true },
      _count: { id: true },
    }),
  ]);

  // ── Streak calculation ────────────────────────────────────────────────────
  let streak = 0;
  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);
  let checkDate = todayMidnight.getTime();

  for (const row of streakRaw) {
    const d = new Date(row.date);
    d.setHours(0, 0, 0, 0);
    const diffDays = Math.round((checkDate - d.getTime()) / 86_400_000);
    if (diffDays === 0 || diffDays === 1) {
      streak++;
      checkDate = d.getTime();
    } else {
      break;
    }
  }

  // ── Build lookup maps for correct counts ──────────────────────────────────
  const subjectCorrectMap = new Map(
    subjectCorrect.map((r) => [r.subject, r._count.id])
  );
  const topicCorrectMap = new Map(
    topicCorrect.map((r) => [`${r.subject}::${r.topic}`, r._count.id])
  );

  const totalAttempts = overviewAgg._count.id;
  const overallAccuracy =
    totalAttempts > 0 ? Math.round((correctTotal / totalAttempts) * 100) : 0;

  // ── Shape subjects ────────────────────────────────────────────────────────
  const subjects = subjectGroups.map((r) => {
    const total   = r._count.id;
    const correct = subjectCorrectMap.get(r.subject) ?? 0;
    return {
      subject:  r.subject,
      total,
      correct,
      accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
      marks:    Math.round((r._sum.marksAwarded ?? 0) * 100) / 100,
    };
  });

  // ── Shape topics ──────────────────────────────────────────────────────────
  const topics = topicGroups.map((r) => {
    const total   = r._count.id;
    const correct = topicCorrectMap.get(`${r.subject}::${r.topic}`) ?? 0;
    return {
      subject:  r.subject,
      topic:    r.topic,
      total,
      correct,
      accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
    };
  });

  // ── Shape daily (fill gaps so the chart has all 30 days) ─────────────────
  const dailyMap = new Map(
    dailyRaw.map((r) => [
      new Date(r.date).toISOString().slice(0, 10),
      { total: Number(r.total), correct: Number(r.correct) },
    ])
  );

  const daily: Array<{ date: string; total: number; correct: number; accuracy: number }> = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const row = dailyMap.get(key) ?? { total: 0, correct: 0 };
    daily.push({
      date:     key,
      total:    row.total,
      correct:  row.correct,
      accuracy: row.total > 0 ? Math.round((row.correct / row.total) * 100) : 0,
    });
  }

  return Response.json({
    overview: {
      totalAttempts,
      correctTotal,
      overallAccuracy,
      totalMarks:  Math.round((overviewAgg._sum.marksAwarded ?? 0) * 100) / 100,
      avgTimeTaken: Math.round(overviewAgg._avg.timeTaken ?? 0),
      streak,
    },
    daily,
    subjects,
    topics,
  });
}

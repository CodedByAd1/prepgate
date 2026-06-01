import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  CreateQuestionSchema,
  QuestionFilterSchema,
} from "@/lib/schemas/question";
import type { Prisma } from "@prisma/client";

// ─── GET /api/questions ── list with filters + pagination ─────────────────────
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const raw = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsed = QuestionFilterSchema.safeParse(raw);

  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const {
    subject,
    topic,
    year,
    difficulty,
    questionType,
    isVerified,
    search,
    page,
    limit,
    sortBy,
    sortOrder,
  } = parsed.data;

  const where: Prisma.QuestionWhereInput = {
    deletedAt: null, // exclude soft-deleted
    ...(subject ? { subject } : {}),
    ...(topic ? { topic: { contains: topic, mode: "insensitive" } } : {}),
    ...(year ? { year } : {}),
    ...(difficulty ? { difficulty } : {}),
    ...(questionType ? { questionType } : {}),
    ...(isVerified !== undefined ? { isVerified } : {}),
    ...(search
      ? {
          OR: [
            { questionText: { contains: search, mode: "insensitive" } },
            { topic: { contains: search, mode: "insensitive" } },
            { tags: { has: search } },
          ],
        }
      : {}),
  };

  const [questions, total] = await Promise.all([
    prisma.question.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        subject: true,
        topic: true,
        year: true,
        marks: true,
        difficulty: true,
        questionType: true,
        questionText: true,
        options: true,
        answer: true,
        explanation: true,
        imageUrl: true,
        imageDescription: true,
        tags: true,
        source: true,
        paperSet: true,
        isVerified: true,
        totalAttempts: true,
        correctAttempts: true,
        avgTimeTaken: true,
        createdAt: true,
      },
    }),
    prisma.question.count({ where }),
  ]);

  return Response.json({
    questions,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  });
}

// ─── POST /api/questions ── create a single question ─────────────────────────
export async function POST(request: Request) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = CreateQuestionSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const question = await prisma.question.create({
    data: {
      ...parsed.data,
      imageUrl:         parsed.data.imageUrl         || null,
      imageDescription: parsed.data.imageDescription || null,
    },
  });

  return Response.json({ question }, { status: 201 });
}

import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UpdateQuestionSchema } from "@/lib/schemas/question";

// ─── GET /api/questions/[id] ── single question ───────────────────────────────
export async function GET(
  _request: NextRequest,
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

  return Response.json({ question });
}

// ─── PATCH /api/questions/[id] ── partial update ──────────────────────────────
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const existing = await prisma.question.findFirst({
    where: { id, deletedAt: null },
    select: { id: true },
  });
  if (!existing) {
    return Response.json({ error: "Question not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = UpdateQuestionSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const question = await prisma.question.update({
    where: { id },
    data: {
      ...parsed.data,
      ...(parsed.data.imageUrl !== undefined
        ? { imageUrl: parsed.data.imageUrl || null }
        : {}),
    },
  });

  return Response.json({ question });
}

// ─── DELETE /api/questions/[id] ── soft delete ────────────────────────────────
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const existing = await prisma.question.findFirst({
    where: { id, deletedAt: null },
    select: { id: true },
  });
  if (!existing) {
    return Response.json({ error: "Question not found" }, { status: 404 });
  }

  // Soft delete — preserves attempt history
  await prisma.question.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  return Response.json({ success: true });
}

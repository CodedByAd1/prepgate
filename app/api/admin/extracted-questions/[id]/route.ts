import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

// PATCH /api/admin/extracted-questions/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();

    const {
      questionText,
      questionType,
      options,
      subject,
      topic,
      year,
      marks,
      difficulty,
      answer,
      explanation,
      reviewStatus,
      imageUrl,
    } = body;

    const updated = await prisma.extractedQuestion.update({
      where: { id },
      data: {
        ...(questionText !== undefined && { questionText }),
        ...(questionType !== undefined && { questionType }),
        ...(options !== undefined && { options }),
        ...(subject !== undefined && { subject }),
        ...(topic !== undefined && { topic }),
        ...(year !== undefined && { year: year ? parseInt(year, 10) : null }),
        ...(marks !== undefined && {
          marks: marks ? parseFloat(marks) : null,
        }),
        ...(difficulty !== undefined && { difficulty }),
        ...(answer !== undefined && { answer }),
        ...(explanation !== undefined && { explanation }),
        ...(reviewStatus !== undefined && { reviewStatus }),
        ...(imageUrl !== undefined && { imageUrl }),
      },
    });

    return Response.json({ question: updated });
  } catch (error) {
    console.error("[extracted-questions PATCH]", error);
    return Response.json(
      { error: "Failed to update question" },
      { status: 500 }
    );
  }
}

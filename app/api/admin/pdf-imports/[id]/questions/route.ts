import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

// GET /api/admin/pdf-imports/[id]/questions
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = request.nextUrl;

  const statusFilter = searchParams.get("status"); // PENDING | APPROVED | REJECTED | null (all)
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") ?? "20", 10);
  const skip = (page - 1) * pageSize;

  try {
    const where = {
      pdfImportId: id,
      ...(statusFilter ? { reviewStatus: statusFilter as "PENDING" | "APPROVED" | "REJECTED" } : {}),
    };

    const [questions, total] = await Promise.all([
      prisma.extractedQuestion.findMany({
        where,
        orderBy: { questionNumber: "asc" },
        skip,
        take: pageSize,
        include: {
          pdfPage: {
            select: { pageNumber: true, imageUrl: true },
          },
        },
      }),
      prisma.extractedQuestion.count({ where }),
    ]);

    return Response.json({
      questions,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("[questions GET]", error);
    return Response.json(
      { error: "Failed to fetch questions" },
      { status: 500 }
    );
  }
}

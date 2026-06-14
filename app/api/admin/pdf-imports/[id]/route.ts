import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export const maxDuration = 10;

// GET /api/admin/pdf-imports/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const pdfImport = await prisma.pdfImport.findUnique({
      where: { id },
      include: {
        pages: {
          orderBy: { pageNumber: "asc" },
        },
        _count: {
          select: {
            extractedQuestions: true,
            pages: true,
          },
        },
        extractedQuestions: {
          select: { reviewStatus: true },
        },
      },
    });

    if (!pdfImport) {
      return Response.json({ error: "Import not found" }, { status: 404 });
    }

    const processedPages = pdfImport.pages.filter((p) => p.processed).length;
    const totalQuestions = pdfImport._count.extractedQuestions;
    const pendingCount = pdfImport.extractedQuestions.filter(
      (q) => q.reviewStatus === "PENDING"
    ).length;
    const approvedCount = pdfImport.extractedQuestions.filter(
      (q) => q.reviewStatus === "APPROVED"
    ).length;

    const progressPercent =
      pdfImport.totalPages > 0
        ? Math.round((processedPages / pdfImport.totalPages) * 100)
        : 0;

    return Response.json({
      import: {
        ...pdfImport,
        processedPages,
        totalQuestions,
        pendingCount,
        approvedCount,
        progressPercent,
      },
    });
  } catch (error) {
    console.error("[pdf-imports/[id] GET]", error);
    return Response.json({ error: "Failed to fetch import" }, { status: 500 });
  }
}

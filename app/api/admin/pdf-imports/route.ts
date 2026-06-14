import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadPdf, ensureBucketsExist } from "@/lib/storage";
import { NextRequest } from "next/server";

export const maxDuration = 30;

// GET /api/admin/pdf-imports — list all imports with stats
export async function GET() {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const imports = await prisma.pdfImport.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            pages: true,
            extractedQuestions: true,
          },
        },
        extractedQuestions: {
          select: { reviewStatus: true },
        },
      },
    });

    // Aggregate stats
    const totalQuestionsExtracted = await prisma.extractedQuestion.count();
    const pendingReviews = await prisma.extractedQuestion.count({
      where: { reviewStatus: "PENDING" },
    });
    const approvedQuestions = await prisma.extractedQuestion.count({
      where: { reviewStatus: "APPROVED" },
    });
    const failedPages = await prisma.pdfPage.count({
      where: { processed: false, pdfImport: { status: "FAILED" } },
    });

    const formattedImports = imports.map((imp) => ({
      id: imp.id,
      fileName: imp.fileName,
      storageUrl: imp.storageUrl,
      status: imp.status,
      totalPages: imp.totalPages,
      errorMsg: imp.errorMsg,
      createdAt: imp.createdAt,
      updatedAt: imp.updatedAt,
      pageCount: imp._count.pages,
      questionCount: imp._count.extractedQuestions,
      pendingCount: imp.extractedQuestions.filter(
        (q) => q.reviewStatus === "PENDING"
      ).length,
      approvedCount: imp.extractedQuestions.filter(
        (q) => q.reviewStatus === "APPROVED"
      ).length,
      rejectedCount: imp.extractedQuestions.filter(
        (q) => q.reviewStatus === "REJECTED"
      ).length,
    }));

    return Response.json({
      imports: formattedImports,
      stats: {
        totalImports: imports.length,
        totalQuestionsExtracted,
        pendingReviews,
        approvedQuestions,
        failedPages,
      },
    });
  } catch (error) {
    console.error("[pdf-imports GET]", error);
    return Response.json({ error: "Failed to fetch imports" }, { status: 500 });
  }
}

// POST /api/admin/pdf-imports — upload a PDF
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return Response.json(
        { error: "Only PDF files are accepted" },
        { status: 400 }
      );
    }

    // Max 50MB
    if (file.size > 50 * 1024 * 1024) {
      return Response.json(
        { error: "File size must be under 50MB" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Ensure storage buckets exist
    await ensureBucketsExist();

    // Upload to Supabase Storage
    const storageUrl = await uploadPdf(file.name, buffer);

    // Create DB record — totalPages will be updated during processing
    const pdfImport = await prisma.pdfImport.create({
      data: {
        fileName: file.name,
        storageUrl,
        status: "UPLOADED",
        totalPages: 0,
      },
    });

    return Response.json({ import: pdfImport }, { status: 201 });
  } catch (error) {
    console.error("[pdf-imports POST]", error);
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to upload PDF",
      },
      { status: 500 }
    );
  }
}

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { downloadFromStorage } from "@/lib/storage";
import { getPdfPageCount } from "@/lib/pdf-processor";
import {
  uploadPdfToGemini,
  deleteGeminiFile,
  extractAllQuestionsFromPdf,
  type GeminiFileRef,
} from "@/lib/gemini";
import { NextRequest } from "next/server";

export const maxDuration = 60;

// POST /api/admin/pdf-imports/[id]/process
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const pdfImport = await prisma.pdfImport.findUnique({ where: { id } });
  if (!pdfImport) {
    return Response.json({ error: "Import not found" }, { status: 404 });
  }
  if (pdfImport.status === "PROCESSING") {
    return Response.json({ error: "Already processing" }, { status: 409 });
  }

  await prisma.pdfImport.update({
    where: { id },
    data: { status: "PROCESSING", errorMsg: null },
  });

  // Fire-and-forget — response is immediate, processing happens in background
  processImportAsync(id, pdfImport.storageUrl, pdfImport.fileName).catch(
    async (error) => {
      console.error("[process] Fatal:", error);
      await prisma.pdfImport
        .update({
          where: { id },
          data: {
            status: "FAILED",
            errorMsg: error instanceof Error ? error.message : "Unknown error",
          },
        })
        .catch(() => {});
    }
  );

  return Response.json({ message: "Processing started", importId: id });
}

// ─── Pipeline ─────────────────────────────────────────────────────────────────

async function processImportAsync(
  importId: string,
  pdfStorageUrl: string,
  fileName: string
): Promise<void> {
  let geminiFileRef: GeminiFileRef | null = null;

  try {
    // 1. Download PDF from Supabase Storage
    console.log(`[process:${importId}] Downloading PDF…`);
    const pdfBuffer = await downloadFromStorage(pdfStorageUrl);

    // Extract year from filename (e.g. "CS-2011.pdf" → 2011, "GATE_2023_CS.pdf" → 2023)
    const yearMatch = fileName.match(/20\d{2}/);
    const paperYear = yearMatch ? parseInt(yearMatch[0], 10) : null;
    if (paperYear) console.log(`[process:${importId}] Paper year: ${paperYear}`);

    // 2. Count pages with pdf-lib (pure JS, instant, accurate — no API call)
    console.log(`[process:${importId}] Counting pages…`);
    const totalPages = await getPdfPageCount(pdfBuffer);
    console.log(`[process:${importId}] ${totalPages} pages`);

    await prisma.pdfImport.update({
      where: { id: importId },
      data: { totalPages },
    });

    // 3. Pre-create PdfPage records (one per page) for progress tracking
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      await prisma.pdfPage.upsert({
        where: { pdfImportId_pageNumber: { pdfImportId: importId, pageNumber: pageNum } },
        create: {
          pdfImportId: importId,
          pageNumber: pageNum,
          imageUrl: pdfStorageUrl,
          processed: false,
        },
        update: { processed: false, errorMsg: null },
      });
    }

    // 4. Upload PDF to Gemini Files API (single upload, reused for extraction)
    console.log(`[process:${importId}] Uploading to Gemini Files API…`);
    geminiFileRef = await uploadPdfToGemini(pdfBuffer, fileName);
    console.log(`[process:${importId}] Gemini file URI: ${geminiFileRef.uri}`);

    // 5. Extract + solve ALL questions in ONE Gemini call (saves daily quota)
    console.log(`[process:${importId}] Extracting all questions (1 API call for all ${totalPages} pages)…`);
    const result = await extractAllQuestionsFromPdf(geminiFileRef, totalPages);
    console.log(`[process:${importId}] Gemini returned ${result.questions.length} questions`);

    // 6. Persist questions — group by page for the pdfPage FK
    const pageRecords = await prisma.pdfPage.findMany({
      where: { pdfImportId: importId },
      select: { id: true, pageNumber: true },
    });
    const pageIdByNumber = new Map(pageRecords.map((p) => [p.pageNumber, p.id]));

    for (const q of result.questions) {
      const pdfPageId = pageIdByNumber.get(q.pageNumber) ?? pageIdByNumber.get(1) ?? null;

      await prisma.extractedQuestion.upsert({
        where: {
          pdfImportId_questionNumber: {
            pdfImportId: importId,
            questionNumber: q.questionNumber,
          },
        },
        create: {
          pdfImportId: importId,
          pdfPageId,
          questionNumber: q.questionNumber,
          questionText: q.questionText,
          questionType: q.questionType,
          options: q.options ?? undefined,
          answer: q.answer ?? undefined,
          explanation: q.explanation ?? null,
          subject: q.subject ?? null,
          topic: q.topic ?? null,
          marks: q.marks ?? null,
          difficulty: q.difficulty ?? null,
          year: paperYear,
          containsDiagram: q.containsDiagram,
          continued: q.continued,
          extractionConfidence: q.extractionConfidence,
          imageUrl: q.containsDiagram ? pdfStorageUrl : null,
          reviewStatus: "PENDING",
        },
        update: {
          questionText: q.questionText,
          questionType: q.questionType,
          options: q.options ?? undefined,
          answer: q.answer ?? undefined,
          explanation: q.explanation ?? null,
          subject: q.subject ?? null,
          topic: q.topic ?? null,
          marks: q.marks ?? null,
          difficulty: q.difficulty ?? null,
          year: paperYear,
          containsDiagram: q.containsDiagram,
          continued: q.continued,
          extractionConfidence: q.extractionConfidence,
        },
      });
    }

    // 7. Mark all pages as processed
    await prisma.pdfPage.updateMany({
      where: { pdfImportId: importId },
      data: { processed: true },
    });

    // 8. Mark import as complete
    await prisma.pdfImport.update({
      where: { id: importId },
      data: { status: "COMPLETED" },
    });

    console.log(
      `[process:${importId}] Completed ✓ — ${result.questions.length} questions extracted from ${totalPages} pages`
    );
  } catch (error) {
    console.error(`[process:${importId}] Failed:`, error);
    await prisma.pdfImport.update({
      where: { id: importId },
      data: {
        status: "FAILED",
        errorMsg: error instanceof Error ? error.message : "Processing failed",
      },
    });
    throw error;
  } finally {
    if (geminiFileRef) {
      await deleteGeminiFile(geminiFileRef.name);
      console.log(`[process:${importId}] Gemini file cleaned up`);
    }
  }
}

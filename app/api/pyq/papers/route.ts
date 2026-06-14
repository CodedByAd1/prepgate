import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

/**
 * GET /api/pyq/papers
 * Returns completed PDF question paper imports for students.
 * Query params:
 *   - year?: filter by year extracted from filename (e.g. "2024")
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const yearFilter = searchParams.get("year");

    const imports = await prisma.pdfImport.findMany({
      where: { status: "COMPLETED" },
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

    // Parse year from filename and build enriched records
    const papers = imports
      .map((imp) => {
        const yearMatch = imp.fileName.match(/\b(19|20)\d{2}\b/);
        const year = yearMatch ? parseInt(yearMatch[0], 10) : null;

        const approvedCount = imp.extractedQuestions.filter(
          (q) => q.reviewStatus === "APPROVED"
        ).length;

        // Derive a clean display title from filename
        const displayTitle = imp.fileName
          .replace(/\.[^/.]+$/, "") // remove extension
          .replace(/[_-]/g, " ")    // underscores/dashes → spaces
          .replace(/\s+/g, " ")     // collapse spaces
          .trim();

        return {
          id: imp.id,
          fileName: imp.fileName,
          displayTitle,
          storageUrl: imp.storageUrl,
          year,
          totalPages: imp.totalPages,
          questionCount: imp._count.extractedQuestions,
          approvedCount,
          createdAt: imp.createdAt,
        };
      })
      // Filter by year if requested
      .filter((p) => {
        if (!yearFilter) return true;
        return p.year === parseInt(yearFilter, 10);
      });

    // Extract unique years for the filter bar
    const years = [
      ...new Set(
        imports
          .map((imp) => {
            const m = imp.fileName.match(/\b(19|20)\d{2}\b/);
            return m ? parseInt(m[0], 10) : null;
          })
          .filter((y): y is number => y !== null)
      ),
    ].sort((a, b) => b - a);

    return Response.json({ papers, years });
  } catch (error) {
    console.error("[GET /api/pyq/papers]", error);
    return Response.json(
      { error: "Failed to fetch question papers" },
      { status: 500 }
    );
  }
}

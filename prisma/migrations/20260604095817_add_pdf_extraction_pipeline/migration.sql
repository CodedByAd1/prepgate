-- CreateEnum
CREATE TYPE "PdfImportStatus" AS ENUM ('UPLOADED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "pdf_imports" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "storageUrl" TEXT NOT NULL,
    "status" "PdfImportStatus" NOT NULL DEFAULT 'UPLOADED',
    "totalPages" INTEGER NOT NULL DEFAULT 0,
    "errorMsg" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pdf_imports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pdf_pages" (
    "id" TEXT NOT NULL,
    "pdfImportId" TEXT NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "errorMsg" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pdf_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "extracted_questions" (
    "id" TEXT NOT NULL,
    "pdfImportId" TEXT NOT NULL,
    "pdfPageId" TEXT,
    "questionNumber" INTEGER NOT NULL,
    "questionText" TEXT NOT NULL,
    "options" JSONB,
    "imageUrl" TEXT,
    "questionType" "QuestionType" NOT NULL DEFAULT 'MCQ',
    "containsDiagram" BOOLEAN NOT NULL DEFAULT false,
    "continued" BOOLEAN NOT NULL DEFAULT false,
    "extractionConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "reviewStatus" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "subject" "Subject",
    "topic" TEXT,
    "year" INTEGER,
    "marks" DOUBLE PRECISION,
    "difficulty" "Difficulty",
    "answer" JSONB,
    "explanation" TEXT,
    "importedQuestionId" TEXT,
    "importedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "extracted_questions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pdf_imports_status_idx" ON "pdf_imports"("status");

-- CreateIndex
CREATE INDEX "pdf_imports_createdAt_idx" ON "pdf_imports"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "pdf_pages_pdfImportId_processed_idx" ON "pdf_pages"("pdfImportId", "processed");

-- CreateIndex
CREATE UNIQUE INDEX "pdf_pages_pdfImportId_pageNumber_key" ON "pdf_pages"("pdfImportId", "pageNumber");

-- CreateIndex
CREATE INDEX "extracted_questions_pdfImportId_reviewStatus_idx" ON "extracted_questions"("pdfImportId", "reviewStatus");

-- CreateIndex
CREATE INDEX "extracted_questions_reviewStatus_idx" ON "extracted_questions"("reviewStatus");

-- CreateIndex
CREATE UNIQUE INDEX "extracted_questions_pdfImportId_questionNumber_key" ON "extracted_questions"("pdfImportId", "questionNumber");

-- AddForeignKey
ALTER TABLE "pdf_pages" ADD CONSTRAINT "pdf_pages_pdfImportId_fkey" FOREIGN KEY ("pdfImportId") REFERENCES "pdf_imports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extracted_questions" ADD CONSTRAINT "extracted_questions_pdfImportId_fkey" FOREIGN KEY ("pdfImportId") REFERENCES "pdf_imports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extracted_questions" ADD CONSTRAINT "extracted_questions_pdfPageId_fkey" FOREIGN KEY ("pdfPageId") REFERENCES "pdf_pages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

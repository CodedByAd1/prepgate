-- AlterTable
ALTER TABLE "questions" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "paperSet" TEXT,
ADD COLUMN     "source" TEXT;

-- CreateIndex
CREATE INDEX "questions_isVerified_subject_idx" ON "questions"("isVerified", "subject");

-- CreateIndex
CREATE INDEX "questions_deletedAt_idx" ON "questions"("deletedAt");

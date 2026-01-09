-- AlterTable
ALTER TABLE "DailySheetEmailSend" ADD COLUMN "confirmedBy" TEXT,
ADD COLUMN "confirmedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "DailySheetEmailSend_confirmedAt_idx" ON "DailySheetEmailSend"("confirmedAt");

-- Add fields to prevent duplicate invoice PDF sending

ALTER TABLE "LegalDailySheetEmailSend"
ADD COLUMN "invoicePdfSentAt" TIMESTAMP(3),
ADD COLUMN "invoicePdfSentTo" TEXT,
ADD COLUMN "invoicePdfSentBy" TEXT;

ALTER TABLE "PhysicalDailySheetEmailSend"
ADD COLUMN "invoicePdfSentAt" TIMESTAMP(3),
ADD COLUMN "invoicePdfSentTo" TEXT,
ADD COLUMN "invoicePdfSentBy" TEXT;

CREATE INDEX "LegalDailySheetEmailSend_invoicePdfSentAt_idx"
ON "LegalDailySheetEmailSend" ("invoicePdfSentAt");

CREATE INDEX "PhysicalDailySheetEmailSend_invoicePdfSentAt_idx"
ON "PhysicalDailySheetEmailSend" ("invoicePdfSentAt");


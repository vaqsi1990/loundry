-- CreateTable
CREATE TABLE "DailySheetEmailSend" (
    "id" TEXT NOT NULL,
    "dailySheetId" TEXT NOT NULL,
    "hotelName" TEXT,
    "date" DATE NOT NULL,
    "sentTo" TEXT NOT NULL,
    "subject" TEXT,
    "sheetType" TEXT,
    "pricePerKg" DOUBLE PRECISION,
    "totalWeight" DOUBLE PRECISION,
    "protectorsAmount" DOUBLE PRECISION,
    "totalAmount" DOUBLE PRECISION,
    "payload" JSONB,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailySheetEmailSend_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailySheetEmailSend_dailySheetId_idx" ON "DailySheetEmailSend"("dailySheetId");

-- CreateIndex
CREATE INDEX "DailySheetEmailSend_date_idx" ON "DailySheetEmailSend"("date");

-- CreateIndex
CREATE INDEX "DailySheetEmailSend_hotelName_idx" ON "DailySheetEmailSend"("hotelName");

-- AddForeignKey
ALTER TABLE "DailySheetEmailSend" ADD CONSTRAINT "DailySheetEmailSend_dailySheetId_fkey" FOREIGN KEY ("dailySheetId") REFERENCES "DailySheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

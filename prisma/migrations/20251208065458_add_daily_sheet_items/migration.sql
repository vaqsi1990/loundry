/*
  Warnings:

  - Added the required column `hotelName` to the `DailySheet` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "DailySheet_date_key";

-- AlterTable
ALTER TABLE "DailySheet" ADD COLUMN     "hotelName" TEXT,
ADD COLUMN     "roomNumber" TEXT;

-- CreateTable
CREATE TABLE "DailySheetItem" (
    "id" TEXT NOT NULL,
    "dailySheetId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "itemNameEn" TEXT NOT NULL,
    "itemNameKa" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "received" INTEGER NOT NULL DEFAULT 0,
    "washCount" INTEGER NOT NULL DEFAULT 0,
    "dispatched" INTEGER NOT NULL DEFAULT 0,
    "shortage" INTEGER NOT NULL DEFAULT 0,
    "totalWeight" DOUBLE PRECISION NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailySheetItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailySheetItem_dailySheetId_idx" ON "DailySheetItem"("dailySheetId");

-- CreateIndex
CREATE INDEX "DailySheetItem_category_idx" ON "DailySheetItem"("category");

-- CreateIndex
CREATE INDEX "DailySheet_hotelName_idx" ON "DailySheet"("hotelName");

-- AddForeignKey
ALTER TABLE "DailySheetItem" ADD CONSTRAINT "DailySheetItem_dailySheetId_fkey" FOREIGN KEY ("dailySheetId") REFERENCES "DailySheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

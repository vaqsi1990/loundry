-- CreateTable
CREATE TABLE "Blacklist" (
    "id" TEXT NOT NULL,
    "hotelName" TEXT NOT NULL,
    "hotelRegistrationNumber" TEXT,
    "contactPhone" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT,
    "reason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Blacklist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Blacklist_hotelName_idx" ON "Blacklist"("hotelName");

-- CreateIndex
CREATE INDEX "Blacklist_contactPhone_idx" ON "Blacklist"("contactPhone");

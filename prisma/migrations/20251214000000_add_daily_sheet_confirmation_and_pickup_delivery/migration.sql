-- AlterTable
ALTER TABLE "DailySheet" ADD COLUMN "confirmedBy" TEXT,
ADD COLUMN "confirmedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "DailySheet_confirmedAt_idx" ON "DailySheet"("confirmedAt");

-- CreateTable
CREATE TABLE "PickupDeliveryRequest" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "requestType" TEXT NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PickupDeliveryRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PickupDeliveryRequest_hotelId_idx" ON "PickupDeliveryRequest"("hotelId");

-- CreateIndex
CREATE INDEX "PickupDeliveryRequest_userId_idx" ON "PickupDeliveryRequest"("userId");

-- CreateIndex
CREATE INDEX "PickupDeliveryRequest_status_idx" ON "PickupDeliveryRequest"("status");

-- CreateIndex
CREATE INDEX "PickupDeliveryRequest_requestedAt_idx" ON "PickupDeliveryRequest"("requestedAt");

-- AddForeignKey
ALTER TABLE "PickupDeliveryRequest" ADD CONSTRAINT "PickupDeliveryRequest_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickupDeliveryRequest" ADD CONSTRAINT "PickupDeliveryRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


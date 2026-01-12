-- CreateTable
CREATE TABLE "AdminInvoice" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "totalWeightKg" DOUBLE PRECISION DEFAULT 0,
    "protectorsAmount" DOUBLE PRECISION DEFAULT 0,
    "totalAmount" DOUBLE PRECISION DEFAULT 0,
    "paidAmount" DOUBLE PRECISION DEFAULT 0,
    "status" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminInvoice_invoiceNumber_key" ON "AdminInvoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "AdminInvoice_status_idx" ON "AdminInvoice"("status");

-- CreateIndex
CREATE INDEX "AdminInvoice_dueDate_idx" ON "AdminInvoice"("dueDate");

-- CreateTable
CREATE TABLE "EmployeeTableConfiguration" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeTableConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeTableConfiguration_employeeId_key" ON "EmployeeTableConfiguration"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeTableConfiguration_order_idx" ON "EmployeeTableConfiguration"("order");

-- AddForeignKey
ALTER TABLE "EmployeeTableConfiguration" ADD CONSTRAINT "EmployeeTableConfiguration_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;


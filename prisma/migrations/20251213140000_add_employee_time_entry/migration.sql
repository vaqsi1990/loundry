-- CreateTable
CREATE TABLE "EmployeeTimeEntry" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "arrivalTime" TEXT,
    "departureTime" TEXT,
    "dailySalary" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeTimeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeTimeEntry_employeeId_date_key" ON "EmployeeTimeEntry"("employeeId", "date");

-- CreateIndex
CREATE INDEX "EmployeeTimeEntry_employeeId_idx" ON "EmployeeTimeEntry"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeTimeEntry_date_idx" ON "EmployeeTimeEntry"("date");

-- AddForeignKey
ALTER TABLE "EmployeeTimeEntry" ADD CONSTRAINT "EmployeeTimeEntry_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;


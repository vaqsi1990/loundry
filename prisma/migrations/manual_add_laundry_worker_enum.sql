-- Add LAUNDRY_WORKER (მრეცხავი) to EmployeeRole enum.
-- Run this manually if migrate dev is not used (e.g. due to drift):
-- psql $DATABASE_URL -f prisma/migrations/manual_add_laundry_worker_enum.sql
ALTER TYPE "EmployeeRole" ADD VALUE 'LAUNDRY_WORKER';

-- Create new separate tables for Legal entities
CREATE TABLE "LegalInvoice" (
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

    CONSTRAINT "LegalInvoice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PhysicalInvoice" (
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

    CONSTRAINT "PhysicalInvoice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LegalDailySheet" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "hotelName" TEXT,
    "roomNumber" TEXT,
    "description" TEXT,
    "notes" TEXT,
    "pricePerKg" DOUBLE PRECISION,
    "sheetType" TEXT NOT NULL DEFAULT 'INDIVIDUAL',
    "totalWeight" DOUBLE PRECISION,
    "totalPrice" DOUBLE PRECISION,
    "emailedAt" TIMESTAMP(3),
    "emailedTo" TEXT,
    "emailSendCount" INTEGER NOT NULL DEFAULT 0,
    "confirmedBy" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalDailySheet_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PhysicalDailySheet" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "hotelName" TEXT,
    "roomNumber" TEXT,
    "description" TEXT,
    "notes" TEXT,
    "pricePerKg" DOUBLE PRECISION,
    "sheetType" TEXT NOT NULL DEFAULT 'INDIVIDUAL',
    "totalWeight" DOUBLE PRECISION,
    "totalPrice" DOUBLE PRECISION,
    "emailedAt" TIMESTAMP(3),
    "emailedTo" TEXT,
    "emailSendCount" INTEGER NOT NULL DEFAULT 0,
    "confirmedBy" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhysicalDailySheet_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LegalDailySheetItem" (
    "id" TEXT NOT NULL,
    "dailySheetId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "itemNameKa" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "received" INTEGER NOT NULL DEFAULT 0,
    "washCount" INTEGER NOT NULL DEFAULT 0,
    "dispatched" INTEGER NOT NULL DEFAULT 0,
    "shortage" INTEGER NOT NULL DEFAULT 0,
    "totalWeight" DOUBLE PRECISION NOT NULL,
    "price" DOUBLE PRECISION,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalDailySheetItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PhysicalDailySheetItem" (
    "id" TEXT NOT NULL,
    "dailySheetId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "itemNameKa" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "received" INTEGER NOT NULL DEFAULT 0,
    "washCount" INTEGER NOT NULL DEFAULT 0,
    "dispatched" INTEGER NOT NULL DEFAULT 0,
    "shortage" INTEGER NOT NULL DEFAULT 0,
    "totalWeight" DOUBLE PRECISION NOT NULL,
    "price" DOUBLE PRECISION,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhysicalDailySheetItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LegalDailySheetEmailSend" (
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
    "confirmedBy" TEXT,
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "LegalDailySheetEmailSend_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PhysicalDailySheetEmailSend" (
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
    "confirmedBy" TEXT,
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "PhysicalDailySheetEmailSend_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LegalPickupDeliveryRequest" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "requestType" TEXT NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "hiddenFromAdmin" BOOLEAN NOT NULL DEFAULT false,
    "hiddenFromManager" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalPickupDeliveryRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PhysicalPickupDeliveryRequest" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "requestType" TEXT NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "hiddenFromAdmin" BOOLEAN NOT NULL DEFAULT false,
    "hiddenFromManager" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhysicalPickupDeliveryRequest_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE UNIQUE INDEX "LegalInvoice_invoiceNumber_key" ON "LegalInvoice"("invoiceNumber");
CREATE INDEX "LegalInvoice_status_idx" ON "LegalInvoice"("status");
CREATE INDEX "LegalInvoice_dueDate_idx" ON "LegalInvoice"("dueDate");

CREATE UNIQUE INDEX "PhysicalInvoice_invoiceNumber_key" ON "PhysicalInvoice"("invoiceNumber");
CREATE INDEX "PhysicalInvoice_status_idx" ON "PhysicalInvoice"("status");
CREATE INDEX "PhysicalInvoice_dueDate_idx" ON "PhysicalInvoice"("dueDate");

CREATE INDEX "LegalDailySheet_date_idx" ON "LegalDailySheet"("date");
CREATE INDEX "LegalDailySheet_hotelName_idx" ON "LegalDailySheet"("hotelName");
CREATE INDEX "LegalDailySheet_emailedAt_idx" ON "LegalDailySheet"("emailedAt");
CREATE INDEX "LegalDailySheet_confirmedAt_idx" ON "LegalDailySheet"("confirmedAt");

CREATE INDEX "PhysicalDailySheet_date_idx" ON "PhysicalDailySheet"("date");
CREATE INDEX "PhysicalDailySheet_hotelName_idx" ON "PhysicalDailySheet"("hotelName");
CREATE INDEX "PhysicalDailySheet_emailedAt_idx" ON "PhysicalDailySheet"("emailedAt");
CREATE INDEX "PhysicalDailySheet_confirmedAt_idx" ON "PhysicalDailySheet"("confirmedAt");

CREATE INDEX "LegalDailySheetItem_dailySheetId_idx" ON "LegalDailySheetItem"("dailySheetId");
CREATE INDEX "LegalDailySheetItem_category_idx" ON "LegalDailySheetItem"("category");

CREATE INDEX "PhysicalDailySheetItem_dailySheetId_idx" ON "PhysicalDailySheetItem"("dailySheetId");
CREATE INDEX "PhysicalDailySheetItem_category_idx" ON "PhysicalDailySheetItem"("category");

CREATE INDEX "LegalDailySheetEmailSend_dailySheetId_idx" ON "LegalDailySheetEmailSend"("dailySheetId");
CREATE INDEX "LegalDailySheetEmailSend_date_idx" ON "LegalDailySheetEmailSend"("date");
CREATE INDEX "LegalDailySheetEmailSend_hotelName_idx" ON "LegalDailySheetEmailSend"("hotelName");
CREATE INDEX "LegalDailySheetEmailSend_confirmedAt_idx" ON "LegalDailySheetEmailSend"("confirmedAt");

CREATE INDEX "PhysicalDailySheetEmailSend_dailySheetId_idx" ON "PhysicalDailySheetEmailSend"("dailySheetId");
CREATE INDEX "PhysicalDailySheetEmailSend_date_idx" ON "PhysicalDailySheetEmailSend"("date");
CREATE INDEX "PhysicalDailySheetEmailSend_hotelName_idx" ON "PhysicalDailySheetEmailSend"("hotelName");
CREATE INDEX "PhysicalDailySheetEmailSend_confirmedAt_idx" ON "PhysicalDailySheetEmailSend"("confirmedAt");

CREATE INDEX "LegalPickupDeliveryRequest_hotelId_idx" ON "LegalPickupDeliveryRequest"("hotelId");
CREATE INDEX "LegalPickupDeliveryRequest_userId_idx" ON "LegalPickupDeliveryRequest"("userId");
CREATE INDEX "LegalPickupDeliveryRequest_status_idx" ON "LegalPickupDeliveryRequest"("status");
CREATE INDEX "LegalPickupDeliveryRequest_requestedAt_idx" ON "LegalPickupDeliveryRequest"("requestedAt");

CREATE INDEX "PhysicalPickupDeliveryRequest_hotelId_idx" ON "PhysicalPickupDeliveryRequest"("hotelId");
CREATE INDEX "PhysicalPickupDeliveryRequest_userId_idx" ON "PhysicalPickupDeliveryRequest"("userId");
CREATE INDEX "PhysicalPickupDeliveryRequest_status_idx" ON "PhysicalPickupDeliveryRequest"("status");
CREATE INDEX "PhysicalPickupDeliveryRequest_requestedAt_idx" ON "PhysicalPickupDeliveryRequest"("requestedAt");

-- Create foreign keys
ALTER TABLE "LegalDailySheetItem" ADD CONSTRAINT "LegalDailySheetItem_dailySheetId_fkey" FOREIGN KEY ("dailySheetId") REFERENCES "LegalDailySheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PhysicalDailySheetItem" ADD CONSTRAINT "PhysicalDailySheetItem_dailySheetId_fkey" FOREIGN KEY ("dailySheetId") REFERENCES "PhysicalDailySheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LegalDailySheetEmailSend" ADD CONSTRAINT "LegalDailySheetEmailSend_dailySheetId_fkey" FOREIGN KEY ("dailySheetId") REFERENCES "LegalDailySheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PhysicalDailySheetEmailSend" ADD CONSTRAINT "PhysicalDailySheetEmailSend_dailySheetId_fkey" FOREIGN KEY ("dailySheetId") REFERENCES "PhysicalDailySheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LegalPickupDeliveryRequest" ADD CONSTRAINT "LegalPickupDeliveryRequest_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LegalPickupDeliveryRequest" ADD CONSTRAINT "LegalPickupDeliveryRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PhysicalPickupDeliveryRequest" ADD CONSTRAINT "PhysicalPickupDeliveryRequest_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PhysicalPickupDeliveryRequest" ADD CONSTRAINT "PhysicalPickupDeliveryRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate Invoice data based on hotel type
-- Match invoices to hotels by customerName = hotelName, then check hotel type
INSERT INTO "LegalInvoice" ("id", "invoiceNumber", "customerName", "customerEmail", "amount", "totalWeightKg", "protectorsAmount", "totalAmount", "paidAmount", "status", "dueDate", "createdAt", "updatedAt")
SELECT 
    i."id",
    i."invoiceNumber",
    i."customerName",
    i."customerEmail",
    i."amount",
    i."totalWeightKg",
    i."protectorsAmount",
    i."totalAmount",
    i."paidAmount",
    i."status",
    i."dueDate",
    i."createdAt",
    i."updatedAt"
FROM "Invoice" i
INNER JOIN "Hotel" h ON LOWER(TRIM(regexp_replace(i."customerName", '\s+', ' ', 'g'))) = LOWER(TRIM(regexp_replace(h."hotelName", '\s+', ' ', 'g')))
WHERE h."type" = 'LEGAL'
ON CONFLICT ("invoiceNumber") DO NOTHING;

INSERT INTO "PhysicalInvoice" ("id", "invoiceNumber", "customerName", "customerEmail", "amount", "totalWeightKg", "protectorsAmount", "totalAmount", "paidAmount", "status", "dueDate", "createdAt", "updatedAt")
SELECT 
    i."id",
    i."invoiceNumber",
    i."customerName",
    i."customerEmail",
    i."amount",
    i."totalWeightKg",
    i."protectorsAmount",
    i."totalAmount",
    i."paidAmount",
    i."status",
    i."dueDate",
    i."createdAt",
    i."updatedAt"
FROM "Invoice" i
INNER JOIN "Hotel" h ON LOWER(TRIM(regexp_replace(i."customerName", '\s+', ' ', 'g'))) = LOWER(TRIM(regexp_replace(h."hotelName", '\s+', ' ', 'g')))
WHERE h."type" = 'PHYSICAL'
ON CONFLICT ("invoiceNumber") DO NOTHING;

-- Migrate DailySheet data based on hotel type
INSERT INTO "LegalDailySheet" ("id", "date", "hotelName", "roomNumber", "description", "notes", "pricePerKg", "sheetType", "totalWeight", "totalPrice", "emailedAt", "emailedTo", "emailSendCount", "confirmedBy", "confirmedAt", "createdAt", "updatedAt")
SELECT 
    ds."id",
    ds."date",
    ds."hotelName",
    ds."roomNumber",
    ds."description",
    ds."notes",
    ds."pricePerKg",
    ds."sheetType",
    ds."totalWeight",
    ds."totalPrice",
    ds."emailedAt",
    ds."emailedTo",
    ds."emailSendCount",
    ds."confirmedBy",
    ds."confirmedAt",
    ds."createdAt",
    ds."updatedAt"
FROM "DailySheet" ds
INNER JOIN "Hotel" h ON LOWER(TRIM(regexp_replace(COALESCE(ds."hotelName", ''), '\s+', ' ', 'g'))) = LOWER(TRIM(regexp_replace(h."hotelName", '\s+', ' ', 'g')))
WHERE h."type" = 'LEGAL' AND ds."hotelName" IS NOT NULL;

INSERT INTO "PhysicalDailySheet" ("id", "date", "hotelName", "roomNumber", "description", "notes", "pricePerKg", "sheetType", "totalWeight", "totalPrice", "emailedAt", "emailedTo", "emailSendCount", "confirmedBy", "confirmedAt", "createdAt", "updatedAt")
SELECT 
    ds."id",
    ds."date",
    ds."hotelName",
    ds."roomNumber",
    ds."description",
    ds."notes",
    ds."pricePerKg",
    ds."sheetType",
    ds."totalWeight",
    ds."totalPrice",
    ds."emailedAt",
    ds."emailedTo",
    ds."emailSendCount",
    ds."confirmedBy",
    ds."confirmedAt",
    ds."createdAt",
    ds."updatedAt"
FROM "DailySheet" ds
INNER JOIN "Hotel" h ON LOWER(TRIM(regexp_replace(COALESCE(ds."hotelName", ''), '\s+', ' ', 'g'))) = LOWER(TRIM(regexp_replace(h."hotelName", '\s+', ' ', 'g')))
WHERE h."type" = 'PHYSICAL' AND ds."hotelName" IS NOT NULL;

-- Migrate DailySheetItem data
INSERT INTO "LegalDailySheetItem" ("id", "dailySheetId", "category", "itemNameKa", "weight", "received", "washCount", "dispatched", "shortage", "totalWeight", "price", "comment", "createdAt", "updatedAt")
SELECT 
    dsi."id",
    dsi."dailySheetId",
    dsi."category",
    dsi."itemNameKa",
    dsi."weight",
    dsi."received",
    dsi."washCount",
    dsi."dispatched",
    dsi."shortage",
    dsi."totalWeight",
    dsi."price",
    dsi."comment",
    dsi."createdAt",
    dsi."updatedAt"
FROM "DailySheetItem" dsi
INNER JOIN "LegalDailySheet" lds ON dsi."dailySheetId" = lds."id";

INSERT INTO "PhysicalDailySheetItem" ("id", "dailySheetId", "category", "itemNameKa", "weight", "received", "washCount", "dispatched", "shortage", "totalWeight", "price", "comment", "createdAt", "updatedAt")
SELECT 
    dsi."id",
    dsi."dailySheetId",
    dsi."category",
    dsi."itemNameKa",
    dsi."weight",
    dsi."received",
    dsi."washCount",
    dsi."dispatched",
    dsi."shortage",
    dsi."totalWeight",
    dsi."price",
    dsi."comment",
    dsi."createdAt",
    dsi."updatedAt"
FROM "DailySheetItem" dsi
INNER JOIN "PhysicalDailySheet" pds ON dsi."dailySheetId" = pds."id";

-- Migrate DailySheetEmailSend data
INSERT INTO "LegalDailySheetEmailSend" ("id", "dailySheetId", "hotelName", "date", "sentTo", "subject", "sheetType", "pricePerKg", "totalWeight", "protectorsAmount", "totalAmount", "payload", "sentAt", "confirmedBy", "confirmedAt")
SELECT 
    dses."id",
    dses."dailySheetId",
    dses."hotelName",
    dses."date",
    dses."sentTo",
    dses."subject",
    dses."sheetType",
    dses."pricePerKg",
    dses."totalWeight",
    dses."protectorsAmount",
    dses."totalAmount",
    dses."payload",
    dses."sentAt",
    dses."confirmedBy",
    dses."confirmedAt"
FROM "DailySheetEmailSend" dses
INNER JOIN "LegalDailySheet" lds ON dses."dailySheetId" = lds."id";

INSERT INTO "PhysicalDailySheetEmailSend" ("id", "dailySheetId", "hotelName", "date", "sentTo", "subject", "sheetType", "pricePerKg", "totalWeight", "protectorsAmount", "totalAmount", "payload", "sentAt", "confirmedBy", "confirmedAt")
SELECT 
    dses."id",
    dses."dailySheetId",
    dses."hotelName",
    dses."date",
    dses."sentTo",
    dses."subject",
    dses."sheetType",
    dses."pricePerKg",
    dses."totalWeight",
    dses."protectorsAmount",
    dses."totalAmount",
    dses."payload",
    dses."sentAt",
    dses."confirmedBy",
    dses."confirmedAt"
FROM "DailySheetEmailSend" dses
INNER JOIN "PhysicalDailySheet" pds ON dses."dailySheetId" = pds."id";

-- Migrate PickupDeliveryRequest data based on hotel type
INSERT INTO "LegalPickupDeliveryRequest" ("id", "hotelId", "userId", "requestType", "notes", "status", "requestedAt", "confirmedAt", "completedAt", "hiddenFromAdmin", "hiddenFromManager", "createdAt", "updatedAt")
SELECT 
    pdr."id",
    pdr."hotelId",
    pdr."userId",
    pdr."requestType",
    pdr."notes",
    pdr."status",
    pdr."requestedAt",
    pdr."confirmedAt",
    pdr."completedAt",
    COALESCE(pdr."hiddenFromAdmin", false),
    COALESCE(pdr."hiddenFromManager", false),
    pdr."createdAt",
    pdr."updatedAt"
FROM "PickupDeliveryRequest" pdr
INNER JOIN "Hotel" h ON pdr."hotelId" = h."id"
WHERE h."type" = 'LEGAL';

INSERT INTO "PhysicalPickupDeliveryRequest" ("id", "hotelId", "userId", "requestType", "notes", "status", "requestedAt", "confirmedAt", "completedAt", "hiddenFromAdmin", "hiddenFromManager", "createdAt", "updatedAt")
SELECT 
    pdr."id",
    pdr."hotelId",
    pdr."userId",
    pdr."requestType",
    pdr."notes",
    pdr."status",
    pdr."requestedAt",
    pdr."confirmedAt",
    pdr."completedAt",
    COALESCE(pdr."hiddenFromAdmin", false),
    COALESCE(pdr."hiddenFromManager", false),
    pdr."createdAt",
    pdr."updatedAt"
FROM "PickupDeliveryRequest" pdr
INNER JOIN "Hotel" h ON pdr."hotelId" = h."id"
WHERE h."type" = 'PHYSICAL';

-- Drop old tables (only after successful migration)
DROP TABLE IF EXISTS "DailySheetEmailSend" CASCADE;
DROP TABLE IF EXISTS "DailySheetItem" CASCADE;
DROP TABLE IF EXISTS "DailySheet" CASCADE;
DROP TABLE IF EXISTS "Invoice" CASCADE;
DROP TABLE IF EXISTS "PickupDeliveryRequest" CASCADE;

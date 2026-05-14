import prisma from "@/lib/prisma";
import {
  invoiceManualTotalStoredAsBaseFromPayload,
  invoicePdfLineItemsFromSortedSends,
  liveDisplayedTotalWeightKg,
  liveProtectorsAmount,
} from "@/lib/daily-sheet-email-send-financial";

const INVOICE_TIME_MATCH_TIGHT_MS = 15 * 60 * 1000;
const INVOICE_TIME_MATCH_LOOSE_MS = 24 * 60 * 60 * 1000;

function localDayBounds(d: Date): { start: Date; end: Date } {
  const x = new Date(d);
  const start = new Date(x.getFullYear(), x.getMonth(), x.getDate(), 0, 0, 0, 0);
  const end = new Date(x.getFullYear(), x.getMonth(), x.getDate(), 23, 59, 59, 999);
  return { start, end };
}

function normalizeHotel(name: string | null | undefined): string {
  if (!name) return "";
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

type HotelForBuyer = {
  type: string;
  hotelName: string;
  legalEntityName: string | null;
  companyName: string | null;
  firstName: string | null;
  lastName: string | null;
  pricePerKg: number | null;
};

function buyerNameFromHotel(hotel: HotelForBuyer): string {
  return hotel.type === "LEGAL"
    ? hotel.legalEntityName?.trim() ||
        hotel.companyName?.trim() ||
        hotel.hotelName
    : [hotel.firstName?.trim(), hotel.lastName?.trim()].filter(Boolean).join(" ") ||
        hotel.hotelName;
}

const emailSendInclude = {
  dailySheet: { include: { items: true } as const },
} as const;

/** Fields used to match hotel + batch (legal and physical sends share this shape when `include` is set). */
type EmailSendBatchSeed = {
  hotelName: string | null;
  dailySheet: { hotelName: string | null } | null;
};

function pickInvoiceForPdfTime<
  T extends { id: string; createdAt: Date; dueDate: Date },
>(candidates: T[], pdfAt: Date): T | null {
  if (candidates.length === 0) return null;
  const byTight = candidates.filter(
    (c) => Math.abs(c.createdAt.getTime() - pdfAt.getTime()) <= INVOICE_TIME_MATCH_TIGHT_MS
  );
  const pool = byTight.length > 0 ? byTight : candidates;
  const sorted = [...pool].sort(
    (a, b) =>
      Math.abs(a.createdAt.getTime() - pdfAt.getTime()) -
      Math.abs(b.createdAt.getTime() - pdfAt.getTime())
  );
  const best = sorted[0];
  if (Math.abs(best.createdAt.getTime() - pdfAt.getTime()) <= INVOICE_TIME_MATCH_LOOSE_MS) {
    return best;
  }
  return null;
}

async function resolveHotel(kind: "LEGAL" | "PHYSICAL", seed: EmailSendBatchSeed) {
  const label = normalizeHotel(
    seed.hotelName ?? seed.dailySheet?.hotelName ?? null
  );
  if (!label) return null;

  const hotels = await prisma.hotel.findMany({
    where: { type: kind },
    select: {
      type: true,
      hotelName: true,
      legalEntityName: true,
      companyName: true,
      firstName: true,
      lastName: true,
      pricePerKg: true,
    },
  });
  return (
    hotels.find((h) => normalizeHotel(h.hotelName) === label) ?? null
  );
}

function sameBatchHotel(seed: EmailSendBatchSeed, es: EmailSendBatchSeed): boolean {
  const a = normalizeHotel(seed.hotelName ?? seed.dailySheet?.hotelName);
  const b = normalizeHotel(es.hotelName ?? es.dailySheet?.hotelName);
  return a.length > 0 && a === b;
}

async function syncLegal(emailSendId: string): Promise<void> {
  const seed = await prisma.legalDailySheetEmailSend.findUnique({
    where: { id: emailSendId },
    include: emailSendInclude,
  });
  if (!seed?.invoicePdfSentAt) return;

  const sameTime = await prisma.legalDailySheetEmailSend.findMany({
    where: { invoicePdfSentAt: seed.invoicePdfSentAt },
    include: emailSendInclude,
    orderBy: { date: "asc" },
  });
  const batch = sameTime.filter((es) => sameBatchHotel(seed, es));
  if (batch.length === 0) return;

  const hotel = await resolveHotel("LEGAL", seed);
  if (!hotel) return;

  const pricePerKg = hotel.pricePerKg || 1.8;
  const buyerName = buyerNameFromHotel(hotel);

  const sorted = [...batch].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const serviceDate = new Date(sorted[0].date);
  const { start: serviceDayStart, end: serviceDayEnd } = localDayBounds(serviceDate);

  const items = invoicePdfLineItemsFromSortedSends(
    sorted.map((s) => ({
      date: s.date,
      dailySheet: s.dailySheet,
      totalAmountOverrideGel: s.totalAmount ?? null,
      invoiceManualTotalStoredAsBase: invoiceManualTotalStoredAsBaseFromPayload(
        s.payload
      ),
    })),
    pricePerKg
  );
  const totalAmount = parseFloat(
    items.reduce((sum, row) => sum + row.total, 0).toFixed(2)
  );
  const totalWeightKg = parseFloat(
    batch
      .reduce((sum, es) => sum + liveDisplayedTotalWeightKg(es.dailySheet), 0)
      .toFixed(2)
  );
  const protectorsAmount = parseFloat(
    batch
      .reduce((sum, es) => sum + liveProtectorsAmount(es.dailySheet), 0)
      .toFixed(2)
  );

  const pdfAt = seed.invoicePdfSentAt;
  const candidates = await prisma.legalInvoice.findMany({
    where: {
      customerName: buyerName,
      dueDate: { gte: serviceDayStart, lte: serviceDayEnd },
    },
    select: { id: true, createdAt: true, dueDate: true },
  });

  const invoice = pickInvoiceForPdfTime(candidates, pdfAt);
  if (!invoice) return;

  await prisma.legalInvoice.update({
    where: { id: invoice.id },
    data: {
      amount: totalAmount,
      totalAmount,
      totalWeightKg,
      protectorsAmount,
    },
  });
}

async function syncPhysical(emailSendId: string): Promise<void> {
  const seed = await prisma.physicalDailySheetEmailSend.findUnique({
    where: { id: emailSendId },
    include: emailSendInclude,
  });
  if (!seed?.invoicePdfSentAt) return;

  const sameTime = await prisma.physicalDailySheetEmailSend.findMany({
    where: { invoicePdfSentAt: seed.invoicePdfSentAt },
    include: emailSendInclude,
    orderBy: { date: "asc" },
  });
  const batch = sameTime.filter((es) => sameBatchHotel(seed, es));
  if (batch.length === 0) return;

  const hotel = await resolveHotel("PHYSICAL", seed);
  if (!hotel) return;

  const pricePerKg = hotel.pricePerKg || 1.8;
  const buyerName = buyerNameFromHotel(hotel);

  const sorted = [...batch].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const serviceDate = new Date(sorted[0].date);
  const { start: serviceDayStart, end: serviceDayEnd } = localDayBounds(serviceDate);

  const items = invoicePdfLineItemsFromSortedSends(
    sorted.map((s) => ({
      date: s.date,
      dailySheet: s.dailySheet,
      totalAmountOverrideGel: s.totalAmount ?? null,
      invoiceManualTotalStoredAsBase: invoiceManualTotalStoredAsBaseFromPayload(
        s.payload
      ),
    })),
    pricePerKg
  );
  const totalAmount = parseFloat(
    items.reduce((sum, row) => sum + row.total, 0).toFixed(2)
  );
  const totalWeightKg = parseFloat(
    batch
      .reduce((sum, es) => sum + liveDisplayedTotalWeightKg(es.dailySheet), 0)
      .toFixed(2)
  );
  const protectorsAmount = parseFloat(
    batch
      .reduce((sum, es) => sum + liveProtectorsAmount(es.dailySheet), 0)
      .toFixed(2)
  );

  const pdfAt = seed.invoicePdfSentAt;
  const candidates = await prisma.physicalInvoice.findMany({
    where: {
      customerName: buyerName,
      dueDate: { gte: serviceDayStart, lte: serviceDayEnd },
    },
    select: { id: true, createdAt: true, dueDate: true },
  });

  const invoice = pickInvoiceForPdfTime(candidates, pdfAt);
  if (!invoice) return;

  await prisma.physicalInvoice.update({
    where: { id: invoice.id },
    data: {
      amount: totalAmount,
      totalAmount,
      totalWeightKg,
      protectorsAmount,
    },
  });
}

/**
 * After an email-send row (and its daily sheet) is edited, recompute totals on the
 * `LegalInvoice` / `PhysicalInvoice` row that was created when that PDF batch was sent.
 * No-op if the send was never part of a sent PDF (`invoicePdfSentAt` is null) or no row matches.
 */
export async function syncPersistedInvoiceFromEmailSendBatch(
  kind: "LEGAL" | "PHYSICAL",
  emailSendId: string
): Promise<void> {
  if (kind === "LEGAL") {
    await syncLegal(emailSendId);
  } else {
    await syncPhysical(emailSendId);
  }
}

import "dotenv/config";
import prisma from "@/lib/prisma";
import {
  invoiceManualTotalStoredAsBaseFromPayload,
  invoicePdfLineItemsFromSortedSends,
} from "@/lib/daily-sheet-email-send-financial";
import { createHotelDisplayNameResolver } from "@/lib/hotel-customer-resolve";

async function main() {
  const inv = await prisma.legalInvoice.findFirst({
    where: {
      totalAmount: { gte: 2884, lte: 2885 },
      dueDate: { gte: new Date("2026-05-01"), lte: new Date("2026-05-31") },
    },
  });
  if (!inv) {
    console.log("invoice not found");
    return;
  }

  console.log("INVOICE:", {
    id: inv.id,
    customerName: inv.customerName,
    customerEmail: inv.customerEmail,
    totalAmount: inv.totalAmount,
    paidAmount: inv.paidAmount,
    dueDate: inv.dueDate,
    createdAt: inv.createdAt,
  });

  const pdfAt = new Date("2026-06-02T07:17:51.322Z");
  const batch = await prisma.legalDailySheetEmailSend.findMany({
    where: { invoicePdfSentAt: pdfAt },
    include: { dailySheet: { include: { items: true } } },
    orderBy: { date: "asc" },
  });

  console.log("\nBATCH:", batch.length, "daily sheets");
  console.log("hotelName labels in DB:", [...new Set(batch.map((b) => b.hotelName))]);
  if (batch.length > 0) {
    console.log("Date range:", batch[0].date.toISOString().slice(0, 10), "→", batch[batch.length - 1].date.toISOString().slice(0, 10));
  }

  const hotels = await prisma.hotel.findMany({
    select: {
      hotelName: true,
      type: true,
      legalEntityName: true,
      companyName: true,
      firstName: true,
      lastName: true,
      pricePerKg: true,
    },
  });
  const resolver = createHotelDisplayNameResolver(hotels);
  console.log("UI shows hotel:", resolver(inv.customerName));

  const pricePerKg = hotels.find((h) => h.hotelName === "მონუმენტი")?.pricePerKg || 1.8;
  const items = invoicePdfLineItemsFromSortedSends(
    batch.map((s) => ({
      date: s.date,
      dailySheet: s.dailySheet,
      totalAmountOverrideGel: s.totalAmount ?? null,
      invoiceManualTotalStoredAsBase: invoiceManualTotalStoredAsBaseFromPayload(s.payload),
    })),
    pricePerKg
  );
  const computed = parseFloat(items.reduce((s, r) => s + r.total, 0).toFixed(2));
  console.log("Computed batch total:", computed, "₾");

  const byMonth = new Map<string, number>();
  for (const s of batch) {
    const d = new Date(s.date);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    byMonth.set(k, (byMonth.get(k) ?? 0) + 1);
  }
  console.log("Sheets by service month:", Object.fromEntries(byMonth));

  const legacyEmail = "marikaele2011@gmail.com";
  const allMarikaele = await prisma.legalDailySheetEmailSend.findMany({
    where: {
      OR: [
        { sentTo: { equals: legacyEmail, mode: "insensitive" } },
        { invoicePdfSentTo: { equals: legacyEmail, mode: "insensitive" } },
      ],
    },
    select: { id: true, hotelName: true, date: true, invoicePdfSentAt: true },
    orderBy: { date: "asc" },
  });

  const batchIds = new Set(batch.map((b) => b.id));
  const notInBatch = allMarikaele.filter((es) => !batchIds.has(es.id));
  const mayNotInBatch = notInBatch.filter((es) => {
    const d = new Date(es.date);
    return d.getFullYear() === 2026 && d.getMonth() === 4; // May = month index 4
  });

  console.log("\nOther May sheets on marikaele NOT in this invoice:", mayNotInBatch.length);
  console.log("Unsent sheets (no PDF) total:", notInBatch.filter((es) => !es.invoicePdfSentAt).length);

  const aprilInvs = await prisma.legalInvoice.findMany({
    where: {
      customerEmail: { equals: legacyEmail, mode: "insensitive" },
      dueDate: { gte: new Date("2026-04-01"), lte: new Date("2026-04-30") },
    },
    select: { customerName: true, totalAmount: true, paidAmount: true },
  });
  console.log("\nApril invoices (already paid separately):");
  for (const i of aprilInvs) {
    console.log(`  ${resolver(i.customerName)}: ${i.totalAmount} ₾`);
  }

  const mayOnlyInBatch = batch.filter((es) => {
    const d = new Date(es.date);
    return d.getFullYear() === 2026 && d.getMonth() === 4;
  });
  const preMayInBatch = batch.filter((es) => {
    const d = new Date(es.date);
    return d < new Date("2026-05-01");
  });

  console.log("\n=== KEY CHECK: is May invoice mixed? ===");
  console.log("May 2026 sheets IN this invoice:", mayOnlyInBatch.length);
  console.log("Pre-May sheets ALSO in this invoice:", preMayInBatch.length);
  if (preMayInBatch.length > 0) {
    const preMayTotal = invoicePdfLineItemsFromSortedSends(
      preMayInBatch.map((s) => ({
        date: s.date,
        dailySheet: s.dailySheet,
        totalAmountOverrideGel: s.totalAmount ?? null,
        invoiceManualTotalStoredAsBase: invoiceManualTotalStoredAsBaseFromPayload(s.payload),
      })),
      pricePerKg
    );
    const preMaySum = parseFloat(preMayTotal.reduce((s, r) => s + r.total, 0).toFixed(2));
    console.log("Pre-May amount included in invoice:", preMaySum, "₾");
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

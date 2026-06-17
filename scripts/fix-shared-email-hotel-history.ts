/**
 * ისტორიული გასწორება: როცა რამდენიმე სასტუმროს ერთი ინვოისის მეილი ჰქონდა,
 * დღის ფურცლები ხშირად ერთ სასტუმროზე (პირველ რეგისტრაციაზე) იკრიბებოდა.
 *
 * ეს სკრიპტი PDF-ით გაგზავნილ ბაჩებს ინვოისებთან უკავშირებს და სწორ hotelName-ს აყენებს.
 *
 * გამოყენება:
 *   npx tsx scripts/fix-shared-email-hotel-history.ts              # dry-run (ნაგულისხმევი)
 *   npx tsx scripts/fix-shared-email-hotel-history.ts --apply      # ბაზაში ჩაწერა
 *   npx tsx scripts/fix-shared-email-hotel-history.ts --email marikaele2011@gmail.com
 */

import "dotenv/config";
import prisma from "@/lib/prisma";
import { createHotelDisplayNameResolver } from "@/lib/hotel-customer-resolve";
import {
  hotelNamesMatch,
  syncDailySheetHotelAssignmentLegal,
} from "@/lib/sync-daily-sheet-hotel-assignment";
import {
  invoiceManualTotalStoredAsBaseFromPayload,
  invoicePdfLineItemsFromSortedSends,
} from "@/lib/daily-sheet-email-send-financial";

const INVOICE_TIME_MATCH_MS = 15 * 60 * 1000;
const AMOUNT_EPSILON = 0.02;

function parseArgs() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const emailIdx = args.indexOf("--email");
  const legacyEmail =
    emailIdx >= 0 && args[emailIdx + 1]
      ? args[emailIdx + 1]
      : "marikaele2011@gmail.com";
  return { apply, legacyEmail: legacyEmail.trim().toLowerCase() };
}

function amountsNear(a: number, b: number): boolean {
  return Math.abs(a - b) <= AMOUNT_EPSILON;
}

function pickInvoiceForBatch<
  T extends {
    id: string;
    customerName: string;
    totalAmount: number | null;
    amount: number;
    createdAt: Date;
  },
>(candidates: T[], pdfAt: Date, batchTotal: number): T | null {
  const byAmount = candidates.filter((c) =>
    amountsNear(Number(c.totalAmount ?? c.amount ?? 0), batchTotal)
  );
  const pool = byAmount.length > 0 ? byAmount : candidates;
  const byTime = pool.filter(
    (c) => Math.abs(c.createdAt.getTime() - pdfAt.getTime()) <= INVOICE_TIME_MATCH_MS
  );
  const narrowed = byTime.length > 0 ? byTime : pool;
  if (narrowed.length === 0) return null;
  return [...narrowed].sort(
    (a, b) =>
      Math.abs(a.createdAt.getTime() - pdfAt.getTime()) -
      Math.abs(b.createdAt.getTime() - pdfAt.getTime())
  )[0];
}

async function computeBatchTotal(
  batchIds: string[],
  pricePerKg: number
): Promise<number> {
  const fullSends = await prisma.legalDailySheetEmailSend.findMany({
    where: { id: { in: batchIds } },
    include: { dailySheet: { include: { items: true } } },
    orderBy: { date: "asc" },
  });
  const items = invoicePdfLineItemsFromSortedSends(
    fullSends.map((s) => ({
      date: s.date,
      dailySheet: s.dailySheet,
      totalAmountOverrideGel: s.totalAmount ?? null,
      invoiceManualTotalStoredAsBase: invoiceManualTotalStoredAsBaseFromPayload(
        s.payload
      ),
    })),
    pricePerKg
  );
  return parseFloat(items.reduce((sum, row) => sum + row.total, 0).toFixed(2));
}

async function main() {
  const { apply, legacyEmail } = parseArgs();
  console.log(`Mode: ${apply ? "APPLY (writes to DB)" : "DRY-RUN (preview only)"}`);
  console.log(`Legacy shared email: ${legacyEmail}\n`);

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
  const resolveHotel = createHotelDisplayNameResolver(hotels);
  const defaultPricePerKg = hotels.find((h) => h.hotelName === "დატე")?.pricePerKg || 1.8;

  const emailSends = await prisma.legalDailySheetEmailSend.findMany({
    where: {
      OR: [
        { sentTo: { equals: legacyEmail, mode: "insensitive" } },
        { invoicePdfSentTo: { equals: legacyEmail, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      dailySheetId: true,
      hotelName: true,
      date: true,
      invoicePdfSentAt: true,
      invoicePdfSentTo: true,
    },
    orderBy: { date: "asc" },
  });

  if (emailSends.length === 0) {
    console.log("ამ მეილზე ჩანაწერები ვერ მოიძებნა.");
    return;
  }

  const withPdf = emailSends.filter((es) => es.invoicePdfSentAt);
  const withoutPdf = emailSends.filter((es) => !es.invoicePdfSentAt);

  console.log(`სულ email send: ${emailSends.length}`);
  console.log(`  PDF-ით გაგზავნილი: ${withPdf.length}`);
  console.log(`  უგზავნი (ხელით სჭირდება): ${withoutPdf.length}\n`);

  const invoices = await prisma.legalInvoice.findMany({
    where: {
      customerEmail: { equals: legacyEmail, mode: "insensitive" },
    },
    select: {
      id: true,
      customerName: true,
      totalAmount: true,
      amount: true,
      createdAt: true,
      dueDate: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const pdfBatches = new Map<string, typeof withPdf>();
  for (const es of withPdf) {
    const key = es.invoicePdfSentAt!.toISOString();
    const arr = pdfBatches.get(key) ?? [];
    arr.push(es);
    pdfBatches.set(key, arr);
  }

  let fixedSheets = 0;
  let skippedAlreadyOk = 0;
  let unmatchedBatches = 0;
  const usedInvoiceIds = new Set<string>();

  console.log("=== PDF ბაჩები → სასტუმრო ===\n");

  for (const [pdfAtIso, batch] of pdfBatches) {
    const pdfAt = new Date(pdfAtIso);
    const batchTotal = await computeBatchTotal(
      batch.map((es) => es.id),
      defaultPricePerKg
    );
    const availableInvoices = invoices.filter((inv) => !usedInvoiceIds.has(inv.id));
    const invoice = pickInvoiceForBatch(availableInvoices, pdfAt, batchTotal);

    if (!invoice) {
      unmatchedBatches += 1;
      console.log(
        `⚠ ბაჩი ${pdfAtIso}: ინვოისი ვერ მოიძებნა (${batch.length} send, ჯამი ${batchTotal} ₾)`
      );
      continue;
    }
    usedInvoiceIds.add(invoice.id);

    const targetHotel = resolveHotel(invoice.customerName);
    const sheetIds = [...new Set(batch.map((es) => es.dailySheetId))];

    console.log(
      `ბაჩი ${pdfAt.toLocaleString("ka-GE")} | ${batch.length} send | ჯამი ${batchTotal} ₾ | ინვოისი: ${invoice.customerName} (${invoice.totalAmount ?? invoice.amount} ₾) → ${targetHotel}`
    );

    for (const sheetId of sheetIds) {
      const sheet = await prisma.legalDailySheet.findUnique({
        where: { id: sheetId },
        select: { hotelName: true },
      });
      if (!sheet) continue;

      if (hotelNamesMatch(sheet.hotelName, targetHotel)) {
        skippedAlreadyOk += 1;
        continue;
      }

      console.log(`  ფურცელი ${sheetId}: "${sheet.hotelName}" → "${targetHotel}"`);
      if (apply) {
        await syncDailySheetHotelAssignmentLegal(sheetId, {
          hotelName: targetHotel,
          emailedTo: legacyEmail,
        });
      }
      fixedSheets += 1;
    }
  }

  console.log("\n=== უგზავნი ჩანაწერები (ხელით გასაყოფი) ===\n");
  if (withoutPdf.length === 0) {
    console.log("არ არის.");
  } else {
    const byMonth = new Map<string, number>();
    for (const es of withoutPdf) {
      const d = new Date(es.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      byMonth.set(key, (byMonth.get(key) ?? 0) + 1);
    }
    console.log("თვეების მიხედვით:");
    for (const [month, count] of [...byMonth.entries()].sort()) {
      console.log(`  ${month}: ${count} დღის ფურცელი`);
    }
    console.log(
      "\nამ ჩანაწერების გასაყოფად საჭიროა თქვენი წესები (რომელი თარიღები რომელ სასტუმროს ეკუთვნის)."
    );
    console.log(
      "მაგალითად: თუ 2026-01-დან 2026-03-მდე ყველა ვერისიმას ეკუთვნის — შეგვიძლია დავამატოთ --assign ფლაგი."
    );
  }

  console.log("\n=== შეჯამება ===");
  console.log(`PDF ბაჩები: ${pdfBatches.size}`);
  console.log(`გასწორდება ფურცლები: ${fixedSheets}`);
  console.log(`უკვე სწორია: ${skippedAlreadyOk}`);
  console.log(`ბაჩი ინვოისის გარეშე: ${unmatchedBatches}`);
  if (!apply && fixedSheets > 0) {
    console.log("\nჩასაწერად გაუშვით: npx tsx scripts/fix-shared-email-hotel-history.ts --apply");
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

import "dotenv/config";
import prisma from "@/lib/prisma";
import {
  liveGrandTotalAmountGel,
  liveProtectorsAmount,
  summedItemLineWeightKg,
  num,
} from "@/lib/daily-sheet-email-send-financial";

async function main() {
  const batchSize = 200;

  for (const kind of ["legal", "physical"] as const) {
    let cursor: string | null = null;
    let updated = 0;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const sends =
        kind === "legal"
          ? await prisma.legalDailySheetEmailSend.findMany({
              take: batchSize,
              ...(cursor
                ? { skip: 1, cursor: { id: cursor } }
                : {}),
              orderBy: { id: "asc" },
              include: {
                dailySheet: { include: { items: true } },
              },
            })
          : await prisma.physicalDailySheetEmailSend.findMany({
              take: batchSize,
              ...(cursor
                ? { skip: 1, cursor: { id: cursor } }
                : {}),
              orderBy: { id: "asc" },
              include: {
                dailySheet: { include: { items: true } },
              },
            });

      if (sends.length === 0) break;
      cursor = sends[sends.length - 1]?.id ?? null;

      if (kind === "legal") {
        await prisma.$transaction(
          sends.map((es) => {
            const sheet = es.dailySheet;
            const lineSumKg = summedItemLineWeightKg(sheet);
            const storedTw =
              sheet?.totalWeight != null ? num(sheet.totalWeight) : lineSumKg || null;
            const defaultPg =
              num(es.pricePerKg) || num(sheet?.pricePerKg) || 1.8;
            return prisma.legalDailySheetEmailSend.update({
              where: { id: es.id },
              data: {
                sheetType: sheet?.sheetType ?? es.sheetType,
                pricePerKg: (sheet as any)?.pricePerKg ?? es.pricePerKg,
                totalWeight: storedTw,
                protectorsAmount: liveProtectorsAmount(sheet),
                totalAmount: liveGrandTotalAmountGel(sheet, defaultPg),
              },
            });
          })
        );
      } else {
        await prisma.$transaction(
          sends.map((es) => {
            const sheet = es.dailySheet;
            const lineSumKg = summedItemLineWeightKg(sheet);
            const storedTw =
              sheet?.totalWeight != null ? num(sheet.totalWeight) : lineSumKg || null;
            const defaultPg =
              num(es.pricePerKg) || num(sheet?.pricePerKg) || 1.8;
            return prisma.physicalDailySheetEmailSend.update({
              where: { id: es.id },
              data: {
                sheetType: sheet?.sheetType ?? es.sheetType,
                pricePerKg: (sheet as any)?.pricePerKg ?? es.pricePerKg,
                totalWeight: storedTw,
                protectorsAmount: liveProtectorsAmount(sheet),
                totalAmount: liveGrandTotalAmountGel(sheet, defaultPg),
              },
            });
          })
        );
      }

      updated += sends.length;
      console.log(`[${kind}] updated ${updated} emailSends...`);
    }

    console.log(`[${kind}] done. total updated: ${updated}`);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });


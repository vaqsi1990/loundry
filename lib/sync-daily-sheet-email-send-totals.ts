import prisma from "@/lib/prisma";
import {
  liveGrandTotalAmountGel,
  liveHeavyWeightAmountGel,
  liveProtectorsAmount,
  summedItemLineWeightKg,
  num,
} from "@/lib/daily-sheet-email-send-financial";

/**
 * გადაგზავნების შემდეგ ფურცლის შეცვლისას იმათივე `EmailSend` ველებს ვახლდებით,
 * რასაც ინვოისის დადასტურება და ძველი კლიენტი ადარებს.
 */
export async function syncEmailSendTotalsAfterSheetSaveLegal(
  dailySheetId: string
): Promise<void> {
  const sheet = await prisma.legalDailySheet.findUnique({
    where: { id: dailySheetId },
    include: { items: true },
  });
  if (!sheet) return;

  const sends = await prisma.legalDailySheetEmailSend.findMany({
    where: { dailySheetId },
  });
  if (sends.length === 0) return;

  const lineSumKg = summedItemLineWeightKg(sheet);
  const storedTw =
    sheet.totalWeight != null ? num(sheet.totalWeight) : lineSumKg || null;

  await prisma.$transaction(
    sends.map((es) => {
      const defaultPg =
        num(es.pricePerKg) || num(sheet.pricePerKg) || 1.8;
      return prisma.legalDailySheetEmailSend.update({
        where: { id: es.id },
        data: {
          sheetType: sheet.sheetType,
          pricePerKg: sheet.pricePerKg ?? es.pricePerKg,
          totalWeight: storedTw,
          protectorsAmount: liveProtectorsAmount(sheet),
          totalAmount: liveGrandTotalAmountGel(sheet, defaultPg),
        },
      });
    })
  );
}

export async function syncEmailSendTotalsAfterSheetSavePhysical(
  dailySheetId: string
): Promise<void> {
  const sheet = await prisma.physicalDailySheet.findUnique({
    where: { id: dailySheetId },
    include: { items: true },
  });
  if (!sheet) return;

  const sends = await prisma.physicalDailySheetEmailSend.findMany({
    where: { dailySheetId },
  });
  if (sends.length === 0) return;

  const lineSumKg = summedItemLineWeightKg(sheet);
  const storedTw =
    sheet.totalWeight != null ? num(sheet.totalWeight) : lineSumKg || null;

  await prisma.$transaction(
    sends.map((es) => {
      const defaultPg =
        num(es.pricePerKg) || num(sheet.pricePerKg) || 1.8;
      return prisma.physicalDailySheetEmailSend.update({
        where: { id: es.id },
        data: {
          sheetType: sheet.sheetType,
          pricePerKg: sheet.pricePerKg ?? es.pricePerKg,
          totalWeight: storedTw,
          protectorsAmount: liveProtectorsAmount(sheet),
          totalAmount: liveGrandTotalAmountGel(sheet, defaultPg),
        },
      });
    })
  );
}

import prisma from "@/lib/prisma";

export const DAILY_SHEET_ALREADY_SENT_ERROR =
  "ეს დღის ფურცელი უკვე ერთხელ გაიგზავნა და მეორედ ვერ გაიგზავნება.";

export async function findExistingDailySheetEmailSend(
  sheetId: string,
  isLegal: boolean
) {
  if (isLegal) {
    return prisma.legalDailySheetEmailSend.findFirst({
      where: { dailySheetId: sheetId },
      select: { id: true },
    });
  }
  return prisma.physicalDailySheetEmailSend.findFirst({
    where: { dailySheetId: sheetId },
    select: { id: true },
  });
}

export async function dailySheetAlreadySent(
  sheetId: string,
  isLegal: boolean
): Promise<boolean> {
  const existing = await findExistingDailySheetEmailSend(sheetId, isLegal);
  return existing != null;
}

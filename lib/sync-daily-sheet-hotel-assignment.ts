import prisma from "@/lib/prisma";
import { normalizeHotelName } from "@/lib/hotel-customer-resolve";
import {
  syncEmailSendTotalsAfterSheetSaveLegal,
  syncEmailSendTotalsAfterSheetSavePhysical,
} from "@/lib/sync-daily-sheet-email-send-totals";

export type HotelEmailOwner = {
  hotelName: string;
  email: string;
};

/** email → canonical hotelName (first registration wins on duplicates). */
export async function buildHotelEmailOwnerMap(): Promise<Map<string, string>> {
  const hotels = await prisma.hotel.findMany({
    include: { user: { select: { email: true } } },
  });
  const map = new Map<string, string>();
  const add = (email: string | null | undefined, hotelName: string) => {
    const key = email?.trim().toLowerCase();
    const name = hotelName.trim();
    if (!key || !name || map.has(key)) return;
    map.set(key, name);
  };
  for (const hotel of hotels) {
    add(hotel.email, hotel.hotelName);
    add(hotel.user?.email, hotel.hotelName);
  }
  return map;
}

export function hotelNameForEmail(
  email: string | null | undefined,
  ownerMap: Map<string, string>
): string | null {
  const key = email?.trim().toLowerCase();
  if (!key) return null;
  return ownerMap.get(key) ?? null;
}

async function findHotelRecord(hotelName: string) {
  const trimmed = hotelName.trim();
  if (!trimmed) return null;

  const exact = await prisma.hotel.findFirst({
    where: { hotelName: trimmed },
    select: { hotelName: true, email: true, pricePerKg: true },
  });
  if (exact) return exact;

  const all = await prisma.hotel.findMany({
    select: { hotelName: true, email: true, pricePerKg: true },
  });
  const target = normalizeHotelName(trimmed);
  return (
    all.find((h) => normalizeHotelName(h.hotelName) === target) ?? null
  );
}

/**
 * სასტუმროს შეცვლისას ან emailedTo-ს მიხედვით გასწორებისას ფურცელსა და EmailSend-ს ვასინქრონებთ.
 */
export async function syncDailySheetHotelAssignmentLegal(
  dailySheetId: string,
  options?: { hotelName?: string; emailedTo?: string | null }
): Promise<void> {
  const sheet = await prisma.legalDailySheet.findUnique({
    where: { id: dailySheetId },
  });
  if (!sheet) return;

  const targetHotelName = (options?.hotelName ?? sheet.hotelName)?.trim();
  if (!targetHotelName) return;

  const hotel = await findHotelRecord(targetHotelName);
  const emailedTo =
    options?.emailedTo !== undefined
      ? options.emailedTo
      : hotel?.email ?? sheet.emailedTo;

  const sheetPatch: {
    hotelName: string;
    pricePerKg?: number | null;
    emailedTo?: string | null;
  } = {
    hotelName: hotel?.hotelName ?? targetHotelName,
  };
  if (hotel?.pricePerKg != null) sheetPatch.pricePerKg = hotel.pricePerKg;
  if (sheet.emailedAt && emailedTo) sheetPatch.emailedTo = emailedTo;

  await prisma.legalDailySheet.update({
    where: { id: dailySheetId },
    data: sheetPatch,
  });

  const sends = await prisma.legalDailySheetEmailSend.findMany({
    where: { dailySheetId },
  });
  if (sends.length > 0) {
    await prisma.$transaction(
      sends.map((es) =>
        prisma.legalDailySheetEmailSend.update({
          where: { id: es.id },
          data: {
            hotelName: sheetPatch.hotelName,
            ...(emailedTo ? { sentTo: emailedTo } : {}),
            ...(hotel?.pricePerKg != null ? { pricePerKg: hotel.pricePerKg } : {}),
          },
        })
      )
    );
  }

  await syncEmailSendTotalsAfterSheetSaveLegal(dailySheetId);
}

export async function syncDailySheetHotelAssignmentPhysical(
  dailySheetId: string,
  options?: { hotelName?: string; emailedTo?: string | null }
): Promise<void> {
  const sheet = await prisma.physicalDailySheet.findUnique({
    where: { id: dailySheetId },
  });
  if (!sheet) return;

  const targetHotelName = (options?.hotelName ?? sheet.hotelName)?.trim();
  if (!targetHotelName) return;

  const hotel = await findHotelRecord(targetHotelName);
  const emailedTo =
    options?.emailedTo !== undefined
      ? options.emailedTo
      : hotel?.email ?? sheet.emailedTo;

  const sheetPatch: {
    hotelName: string;
    pricePerKg?: number | null;
    emailedTo?: string | null;
  } = {
    hotelName: hotel?.hotelName ?? targetHotelName,
  };
  if (hotel?.pricePerKg != null) sheetPatch.pricePerKg = hotel.pricePerKg;
  if (sheet.emailedAt && emailedTo) sheetPatch.emailedTo = emailedTo;

  await prisma.physicalDailySheet.update({
    where: { id: dailySheetId },
    data: sheetPatch,
  });

  const sends = await prisma.physicalDailySheetEmailSend.findMany({
    where: { dailySheetId },
  });
  if (sends.length > 0) {
    await prisma.$transaction(
      sends.map((es) =>
        prisma.physicalDailySheetEmailSend.update({
          where: { id: es.id },
          data: {
            hotelName: sheetPatch.hotelName,
            ...(emailedTo ? { sentTo: emailedTo } : {}),
            ...(hotel?.pricePerKg != null ? { pricePerKg: hotel.pricePerKg } : {}),
          },
        })
      )
    );
  }

  await syncEmailSendTotalsAfterSheetSavePhysical(dailySheetId);
}

export function hotelNamesMatch(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  return normalizeHotelName(a) === normalizeHotelName(b);
}

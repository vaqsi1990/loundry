import prisma from "@/lib/prisma";
import { normalizeHotelName } from "@/lib/hotel-customer-resolve";

export type HotelForSheetMatch = {
  id: string;
  hotelName: string;
  email: string;
};

export type UserForSheetMatch = {
  email: string;
};

export type DailySheetKind = "legal" | "physical";

type SheetNameContext = {
  aliases: Set<string>;
  rawNames: Set<string>;
  contactEmails: Set<string>;
};

export function getHotelContactEmails(
  hotel: HotelForSheetMatch,
  user: UserForSheetMatch
): Set<string> {
  const emails = new Set<string>();
  const add = (value: string | null | undefined) => {
    const trimmed = value?.trim().toLowerCase();
    if (trimmed) emails.add(trimmed);
  };
  add(user.email);
  add(hotel.email);
  return emails;
}

export function sheetHotelNameMatchesAliases(
  sheetHotelName: string | null | undefined,
  aliases: Set<string>
): boolean {
  if (!sheetHotelName) return false;
  return aliases.has(normalizeHotelName(sheetHotelName));
}

function sheetLinkedDuringExpansion(
  sheet: { hotelName: string | null; emailedTo: string | null },
  rawNames: Set<string>,
  contactEmails: Set<string>
): boolean {
  if (
    sheet.emailedTo &&
    contactEmails.has(sheet.emailedTo.trim().toLowerCase())
  ) {
    return true;
  }
  if (!sheet.hotelName) return false;
  const sheetNorm = normalizeHotelName(sheet.hotelName);
  for (const name of rawNames) {
    if (normalizeHotelName(name) === sheetNorm) return true;
  }
  return false;
}

/** Collect current + historical hotel names linked via email or prior sheet names. */
async function collectHotelDailySheetNameContext(
  kind: DailySheetKind,
  hotel: HotelForSheetMatch,
  user: UserForSheetMatch
): Promise<SheetNameContext> {
  const contactEmails = getHotelContactEmails(hotel, user);
  const rawNames = new Set<string>();
  if (hotel.hotelName?.trim()) {
    rawNames.add(hotel.hotelName.trim());
  }

  const contactList = Array.from(contactEmails);
  let changed = true;
  let iterations = 0;

  while (changed && iterations < 25) {
    iterations += 1;
    changed = false;
    const nameList = Array.from(rawNames);
    const orConditions: object[] = [];

    if (contactList.length > 0) {
      orConditions.push(
        ...contactList.map((email) => ({
          emailedTo: { equals: email, mode: "insensitive" as const },
        }))
      );
    }
    if (nameList.length > 0) {
      orConditions.push({ hotelName: { in: nameList } });
    }
    if (orConditions.length === 0) break;

    const sheets =
      kind === "legal"
        ? await prisma.legalDailySheet.findMany({
            where: { emailedAt: { not: null }, OR: orConditions },
            select: { hotelName: true, emailedTo: true },
          })
        : await prisma.physicalDailySheet.findMany({
            where: { emailedAt: { not: null }, OR: orConditions },
            select: { hotelName: true, emailedTo: true },
          });

    for (const sheet of sheets) {
      if (!sheetLinkedDuringExpansion(sheet, rawNames, contactEmails)) {
        continue;
      }
      if (sheet.hotelName?.trim()) {
        const trimmed = sheet.hotelName.trim();
        if (!rawNames.has(trimmed)) {
          rawNames.add(trimmed);
          changed = true;
        }
      }
    }
  }

  const aliases = new Set(
    Array.from(rawNames).map((name) => normalizeHotelName(name))
  );
  return { aliases, rawNames, contactEmails };
}

export async function collectHotelDailySheetNameAliases(
  kind: DailySheetKind,
  hotel: HotelForSheetMatch,
  user: UserForSheetMatch
): Promise<Set<string>> {
  const { aliases } = await collectHotelDailySheetNameContext(kind, hotel, user);
  return aliases;
}

export function dailySheetBelongsToHotel(
  sheet: { hotelName: string | null; emailedTo?: string | null },
  aliases: Set<string>,
  contactEmails: Set<string>
): boolean {
  if (sheetHotelNameMatchesAliases(sheet.hotelName, aliases)) {
    return true;
  }
  if (!sheet.hotelName || !sheet.emailedTo) {
    return false;
  }
  return contactEmails.has(sheet.emailedTo.trim().toLowerCase());
}

type OwnedSheetRow = {
  id: string;
  hotelName: string | null;
  emailedTo: string | null;
};

async function fetchOwnedDailySheetRows(
  kind: DailySheetKind,
  hotel: HotelForSheetMatch,
  user: UserForSheetMatch
): Promise<{
  rows: OwnedSheetRow[];
  aliases: Set<string>;
  contactEmails: Set<string>;
}> {
  const { aliases, rawNames, contactEmails } =
    await collectHotelDailySheetNameContext(kind, hotel, user);
  const nameList = Array.from(rawNames);
  const contactList = Array.from(contactEmails);
  const orConditions: object[] = [];

  if (contactList.length > 0) {
    orConditions.push(
      ...contactList.map((email) => ({
        emailedTo: { equals: email, mode: "insensitive" as const },
      }))
    );
  }
  if (nameList.length > 0) {
    orConditions.push({ hotelName: { in: nameList } });
  }

  if (orConditions.length === 0) {
    return { rows: [], aliases, contactEmails };
  }

  const select = { id: true, hotelName: true, emailedTo: true } as const;
  const rows =
    kind === "legal"
      ? await prisma.legalDailySheet.findMany({
          where: { emailedAt: { not: null }, OR: orConditions },
          select,
        })
      : await prisma.physicalDailySheet.findMany({
          where: { emailedAt: { not: null }, OR: orConditions },
          select,
        });

  return {
    rows: rows.filter((row) =>
      dailySheetBelongsToHotel(row, aliases, contactEmails)
    ),
    aliases,
    contactEmails,
  };
}

/** Rewrite stored hotelName on owned sheets to the hotel's current name. */
export async function syncOwnedDailySheetHotelNames(
  kind: DailySheetKind,
  hotel: HotelForSheetMatch,
  user: UserForSheetMatch
): Promise<void> {
  const targetName = hotel.hotelName.trim();
  if (!targetName) return;

  const targetNorm = normalizeHotelName(targetName);
  const { rows } = await fetchOwnedDailySheetRows(kind, hotel, user);

  const staleRows = rows.filter(
    (row) =>
      row.hotelName && normalizeHotelName(row.hotelName) !== targetNorm
  );
  if (staleRows.length === 0) return;

  const idsToUpdate = staleRows.map((row) => row.id);
  const legacyNames = [
    ...new Set(
      staleRows
        .map((row) => row.hotelName?.trim())
        .filter((name): name is string => Boolean(name))
    ),
  ];

  if (kind === "legal") {
    await prisma.legalDailySheet.updateMany({
      where: { id: { in: idsToUpdate } },
      data: { hotelName: targetName },
    });
    await prisma.legalDailySheetEmailSend.updateMany({
      where: { dailySheetId: { in: idsToUpdate } },
      data: { hotelName: targetName },
    });
    if (legacyNames.length > 0) {
      await prisma.legalDailySheetEmailSend.updateMany({
        where: { hotelName: { in: legacyNames } },
        data: { hotelName: targetName },
      });
    }
  } else {
    await prisma.physicalDailySheet.updateMany({
      where: { id: { in: idsToUpdate } },
      data: { hotelName: targetName },
    });
    await prisma.physicalDailySheetEmailSend.updateMany({
      where: { dailySheetId: { in: idsToUpdate } },
      data: { hotelName: targetName },
    });
    if (legacyNames.length > 0) {
      await prisma.physicalDailySheetEmailSend.updateMany({
        where: { hotelName: { in: legacyNames } },
        data: { hotelName: targetName },
      });
    }
  }
}

/** Sync every hotel's daily sheets (admin / backfill). */
export async function syncAllDailySheetHotelNames(): Promise<void> {
  const hotels = await prisma.hotel.findMany({
    include: { user: { select: { email: true } } },
  });

  for (const hotel of hotels) {
    const kind: DailySheetKind = hotel.type === "LEGAL" ? "legal" : "physical";
    const user: UserForSheetMatch = {
      email: hotel.user?.email ?? hotel.email,
    };
    await syncOwnedDailySheetHotelNames(
      kind,
      { id: hotel.id, hotelName: hotel.hotelName, email: hotel.email },
      user
    );
  }
}

/** Keep historical daily sheets under the new hotel name after a profile rename. */
export async function renameDailySheetHotelNames(
  kind: DailySheetKind,
  _oldHotelName: string,
  newHotelName: string,
  hotel: HotelForSheetMatch,
  user: UserForSheetMatch
): Promise<void> {
  const trimmedNew = newHotelName.trim();
  if (!trimmedNew || trimmedNew === hotel.hotelName.trim()) {
    return;
  }
  await syncOwnedDailySheetHotelNames(
    kind,
    { ...hotel, hotelName: trimmedNew },
    user
  );
}

export async function syncDailySheetHotelNamesForHotelRecord(
  hotel: {
    id: string;
    type: string;
    hotelName: string;
    email: string;
    user: { email: string } | null;
  },
  newHotelName?: string
): Promise<void> {
  const kind: DailySheetKind = hotel.type === "LEGAL" ? "legal" : "physical";
  const user: UserForSheetMatch = {
    email: hotel.user?.email ?? hotel.email,
  };
  await syncOwnedDailySheetHotelNames(
    kind,
    {
      id: hotel.id,
      hotelName: (newHotelName ?? hotel.hotelName).trim(),
      email: hotel.email,
    },
    user
  );
}

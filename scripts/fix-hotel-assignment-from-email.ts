import "dotenv/config";
import prisma from "@/lib/prisma";
import {
  buildHotelEmailOwnerMap,
  hotelNameForEmail,
  hotelNamesMatch,
  syncDailySheetHotelAssignmentLegal,
  syncDailySheetHotelAssignmentPhysical,
} from "@/lib/sync-daily-sheet-hotel-assignment";

async function fixKind(
  kind: "legal" | "physical",
  ownerMap: Map<string, string>
): Promise<number> {
  const sheets =
    kind === "legal"
      ? await prisma.legalDailySheet.findMany({
          where: { emailedAt: { not: null } },
          select: { id: true, hotelName: true, emailedTo: true },
        })
      : await prisma.physicalDailySheet.findMany({
          where: { emailedAt: { not: null } },
          select: { id: true, hotelName: true, emailedTo: true },
        });

  let fixed = 0;
  for (const sheet of sheets) {
    const ownerHotel = hotelNameForEmail(sheet.emailedTo, ownerMap);
    if (!ownerHotel) continue;
    if (hotelNamesMatch(sheet.hotelName, ownerHotel)) continue;

    console.log(
      `[${kind}] fix sheet ${sheet.id}: "${sheet.hotelName}" → "${ownerHotel}" (emailedTo=${sheet.emailedTo})`
    );

    if (kind === "legal") {
      await syncDailySheetHotelAssignmentLegal(sheet.id, {
        hotelName: ownerHotel,
        emailedTo: sheet.emailedTo,
      });
    } else {
      await syncDailySheetHotelAssignmentPhysical(sheet.id, {
        hotelName: ownerHotel,
        emailedTo: sheet.emailedTo,
      });
    }
    fixed += 1;
  }
  return fixed;
}

async function main() {
  const ownerMap = await buildHotelEmailOwnerMap();
  console.log("Hotel email owners:", Object.fromEntries(ownerMap));

  const legalFixed = await fixKind("legal", ownerMap);
  const physicalFixed = await fixKind("physical", ownerMap);

  console.log(`\nDone. Fixed ${legalFixed} legal + ${physicalFixed} physical sheets.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

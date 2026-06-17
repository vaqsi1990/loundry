import "dotenv/config";
import prisma from "@/lib/prisma";

async function main() {
  const hotels = await prisma.hotel.findMany({
    select: {
      id: true,
      hotelName: true,
      email: true,
      type: true,
      legalEntityName: true,
      companyName: true,
      firstName: true,
      lastName: true,
      user: { select: { email: true } },
    },
    orderBy: { hotelName: "asc" },
  });

  const keywords = ["veris", "monum", "ვერის", "მონუმ", "vera", "monu"];
  const matched = hotels.filter((h) =>
    keywords.some(
      (k) =>
        h.hotelName.toLowerCase().includes(k) ||
        (h.legalEntityName || "").toLowerCase().includes(k) ||
        (h.companyName || "").toLowerCase().includes(k)
    )
  );

  console.log("=== Matched hotels ===");
  for (const h of matched) {
    const buyer =
      h.type === "LEGAL"
        ? h.legalEntityName || h.companyName || h.hotelName
        : [h.firstName, h.lastName].filter(Boolean).join(" ") || h.hotelName;
    console.log(
      JSON.stringify({
        hotelName: h.hotelName,
        email: h.email,
        userEmail: h.user?.email,
        type: h.type,
        buyerName: buyer,
      })
    );
  }

  const emailMap = new Map<string, string[]>();
  for (const h of hotels) {
    for (const e of [h.email, h.user?.email].filter(Boolean)) {
      const key = e!.toLowerCase();
      if (!emailMap.has(key)) emailMap.set(key, []);
      emailMap.get(key)!.push(h.hotelName);
    }
  }
  const dupes = [...emailMap.entries()].filter(([, names]) => names.length > 1);
  console.log("\n=== Duplicate emails (current) ===");
  console.log(dupes.length === 0 ? "None" : JSON.stringify(dupes, null, 2));

  const legalSheets = await prisma.legalDailySheet.findMany({
    where: { emailedAt: { not: null } },
    select: { id: true, hotelName: true, emailedTo: true, date: true },
    orderBy: { date: "desc" },
  });
  const physicalSheets = await prisma.physicalDailySheet.findMany({
    where: { emailedAt: { not: null } },
    select: { id: true, hotelName: true, emailedTo: true, date: true },
    orderBy: { date: "desc" },
  });

  const allSheets = [
    ...legalSheets.map((s) => ({ ...s, kind: "legal" as const })),
    ...physicalSheets.map((s) => ({ ...s, kind: "physical" as const })),
  ];

  console.log("\n=== emailedTo with multiple hotelNames on sheets ===");
  const byEmail = new Map<string, Set<string>>();
  for (const s of allSheets) {
    const key = s.emailedTo?.trim().toLowerCase();
    if (!key) continue;
    if (!byEmail.has(key)) byEmail.set(key, new Set());
    if (s.hotelName) byEmail.get(key)!.add(s.hotelName);
  }
  for (const [email, names] of byEmail) {
    if (names.size > 1) {
      const count = allSheets.filter(
        (s) => s.emailedTo?.toLowerCase() === email
      ).length;
      console.log({ email, sheetCount: count, hotelNames: [...names] });
    }
  }

  const threeHotels = await prisma.hotel.findMany({
    where: {
      OR: [
        { hotelName: { contains: "დატე" } },
        { hotelName: { contains: "ვერის" } },
        { hotelName: { contains: "მონუმ" } },
      ],
    },
    select: {
      hotelName: true,
      email: true,
      legalEntityName: true,
      companyName: true,
      type: true,
      firstName: true,
      lastName: true,
    },
  });
  console.log("\n=== დატე / ვერისიმა / მონუმენტი ===");
  for (const h of threeHotels) console.log(h);

  const { createHotelDisplayNameResolver } = await import(
    "@/lib/hotel-customer-resolve"
  );
  const resolver = createHotelDisplayNameResolver(threeHotels);
  const testNames = [
    'შპს "ჰოსტელ-ინნ"',
    'შპს "ჰოსტელ ინნ"',
    "შპს ჰოსტელ-ინნ",
    "დატე",
    "ვერისიმა",
    "მონუმენტი",
  ];
  console.log("\n=== Display name resolver ===");
  for (const n of testNames) console.log(n, "->", resolver(n));

  const sharedEmail = "marikaele2011@gmail.com";
  const hotelsOnShared = await prisma.hotel.findMany({
    where: {
      OR: [
        { email: { equals: sharedEmail, mode: "insensitive" } },
        { user: { email: { equals: sharedEmail, mode: "insensitive" } } },
      ],
    },
    select: {
      hotelName: true,
      email: true,
      legalEntityName: true,
      companyName: true,
    },
  });
  console.log("\n=== Hotels with marikaele email now ===", hotelsOnShared);

  const invsShared = await prisma.legalInvoice.findMany({
    where: { customerEmail: { equals: sharedEmail, mode: "insensitive" } },
    select: {
      id: true,
      customerName: true,
      dueDate: true,
      totalAmount: true,
      paidAmount: true,
      status: true,
    },
    orderBy: { dueDate: "asc" },
  });
  console.log("\n=== Invoices sent to marikaele ===", invsShared.length);
  for (const i of invsShared) console.log(i);

  const sheetsShared = await prisma.legalDailySheet.findMany({
    where: { emailedTo: { equals: sharedEmail, mode: "insensitive" } },
    select: { hotelName: true, date: true },
    orderBy: { date: "asc" },
  });
  const byHotel = new Map<string, number>();
  for (const s of sheetsShared) {
    const k = s.hotelName || "?";
    byHotel.set(k, (byHotel.get(k) || 0) + 1);
  }
  console.log("\n=== Daily sheets emailedTo marikaele by hotelName ===");
  console.log(Object.fromEntries(byHotel));

  const emailSends = await prisma.legalDailySheetEmailSend.findMany({
    where: { sentTo: { equals: sharedEmail, mode: "insensitive" } },
    select: { hotelName: true, date: true, invoicePdfSentAt: true },
    orderBy: { date: "asc" },
  });
  const byEsHotel = new Map<string, number>();
  for (const es of emailSends) {
    const k = es.hotelName || "?";
    byEsHotel.set(k, (byEsHotel.get(k) || 0) + 1);
  }
  console.log("\n=== EmailSends sentTo marikaele by hotelName ===");
  console.log(Object.fromEntries(byEsHotel));

  const pdfSends = await prisma.legalDailySheetEmailSend.findMany({
    where: {
      sentTo: { equals: sharedEmail, mode: "insensitive" },
      invoicePdfSentAt: { not: null },
    },
    select: {
      id: true,
      hotelName: true,
      date: true,
      invoicePdfSentAt: true,
      invoicePdfSentTo: true,
    },
    orderBy: { invoicePdfSentAt: "asc" },
  });
  console.log("\n=== PDF-sent emailSends count ===", pdfSends.length);
  const byPdfTime = new Map<string, { hotelNames: Set<string>; count: number }>();
  for (const es of pdfSends) {
    const key = es.invoicePdfSentAt!.toISOString();
    if (!byPdfTime.has(key)) byPdfTime.set(key, { hotelNames: new Set(), count: 0 });
    const g = byPdfTime.get(key)!;
    g.hotelNames.add(es.hotelName || "?");
    g.count += 1;
  }
  console.log("PDF batches:", byPdfTime.size);
  for (const [t, g] of byPdfTime) {
    console.log({ pdfAt: t, count: g.count, hotelNames: [...g.hotelNames] });
  }

  // Match batches to invoices by computing totals
  const { invoicePdfLineItemsFromSortedSends, invoiceManualTotalStoredAsBaseFromPayload, liveDisplayedTotalWeightKg } = await import("@/lib/daily-sheet-email-send-financial");
  const hotelsAll = await prisma.hotel.findMany({ select: { hotelName: true, pricePerKg: true, type: true, legalEntityName: true, companyName: true, firstName: true, lastName: true } });
  const hotelByName = new Map(hotelsAll.map(h => [h.hotelName, h]));
  
  for (const [pdfAt, g] of byPdfTime) {
    const batchSends = pdfSends.filter(es => es.invoicePdfSentAt!.toISOString() === pdfAt);
    const ids = batchSends.map(es => es.id);
    const fullSends = await prisma.legalDailySheetEmailSend.findMany({
      where: { id: { in: ids } },
      include: { dailySheet: { include: { items: true } } },
    });
    // try each hotel's pricePerKg
    for (const h of threeHotels) {
      const pricePerKg = hotelByName.get(h.hotelName)?.pricePerKg || 1.8;
      const items = invoicePdfLineItemsFromSortedSends(
        fullSends.map(s => ({
          date: s.date,
          dailySheet: s.dailySheet,
          totalAmountOverrideGel: s.totalAmount ?? null,
          invoiceManualTotalStoredAsBase: invoiceManualTotalStoredAsBaseFromPayload(s.payload),
        })),
        pricePerKg
      );
      const total = parseFloat(items.reduce((sum, row) => sum + row.total, 0).toFixed(2));
      const invMatch = invsShared.find(i => i.totalAmount != null && Math.abs(i.totalAmount - total) < 0.02);
      if (invMatch) {
        console.log({ pdfAt, hotel: h.hotelName, computedTotal: total, invoiceCustomer: invMatch.customerName, invoiceDue: invMatch.dueDate });
      }
    }
  }

  const unsent = await prisma.legalDailySheetEmailSend.count({
    where: { sentTo: { equals: sharedEmail, mode: "insensitive" }, invoicePdfSentAt: null },
  });
  console.log("\n=== Unsent (no PDF) emailSends on marikaele ===", unsent);

  // Sheets NOT under დატე but sent to marikaele (if any historical)
  const nonDate = sheetsShared.filter((s) => s.hotelName !== "დატე");
  console.log("\n=== marikaele sheets NOT labeled დატე ===", nonDate.length);

  if (matched.length > 0) {
    const buyerNames = matched.map((h) =>
      h.type === "LEGAL"
        ? h.legalEntityName || h.companyName || h.hotelName
        : [h.firstName, h.lastName].filter(Boolean).join(" ") || h.hotelName
    );

    const [legalInv, physInv] = await Promise.all([
      prisma.legalInvoice.findMany({
        where: {
          OR: buyerNames.map((n) => ({
            customerName: { contains: n, mode: "insensitive" as const },
          })),
        },
        select: {
          id: true,
          customerName: true,
          customerEmail: true,
          totalAmount: true,
          paidAmount: true,
          dueDate: true,
        },
        orderBy: { dueDate: "desc" },
        take: 20,
      }),
      prisma.physicalInvoice.findMany({
        where: {
          OR: buyerNames.map((n) => ({
            customerName: { contains: n, mode: "insensitive" as const },
          })),
        },
        select: {
          id: true,
          customerName: true,
          customerEmail: true,
          totalAmount: true,
          paidAmount: true,
          dueDate: true,
        },
        orderBy: { dueDate: "desc" },
        take: 20,
      }),
    ]);

    console.log("\n=== Recent invoices for matched hotels ===");
    console.log("legal:", legalInv.length, "physical:", physInv.length);
    for (const inv of [...legalInv, ...physInv].slice(0, 15)) {
      console.log(
        JSON.stringify({
          customerName: inv.customerName,
          customerEmail: inv.customerEmail,
          dueDate: inv.dueDate,
          total: inv.totalAmount,
          paid: inv.paidAmount,
        })
      );
    }
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

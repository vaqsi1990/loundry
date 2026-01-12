import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// Fallback prices for protectors (match DailySheetsSection UI defaults)
const PROTECTOR_PRICES: Record<string, number> = {
  "საბანი დიდი": 15,
  "საბანი პატარა": 10,
  "მატრასის დამცავი დიდი": 15,
  "მატრასის დამცავი პატარა": 10,
  "ბალიში დიდი": 7,
  "ბალიში პატარა": 5,
  "ბალიში საბავშვო": 5,
};

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "არ არის ავტორიზებული" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || (user.role !== "ADMIN" && user.role !== "MANAGER" && user.role !== "MANAGER_ASSISTANT")) {
      return NextResponse.json(
        { error: "დაუშვებელია" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const monthParam = searchParams.get("month");
    const dateParam = searchParams.get("date");
    const monthsOnly = searchParams.get("months") === "true";
    const searchQuery = searchParams.get("search");
    const emailSendsMonthParam = searchParams.get("emailSendsMonth"); // For filtering email sends by month

    // If months=true, return all available months with email send counts (from both Legal and Physical DailySheetEmailSend)
    if (monthsOnly) {
      const [legalEmailSends, physicalEmailSends] = await Promise.all([
        prisma.legalDailySheetEmailSend.findMany({
          select: {
            sentAt: true,
          },
          orderBy: {
            sentAt: "desc",
          },
        }),
        prisma.physicalDailySheetEmailSend.findMany({
          select: {
            sentAt: true,
          },
          orderBy: {
            sentAt: "desc",
          },
        }),
      ]);
      const emailSends = [...legalEmailSends, ...physicalEmailSends];

      // Group by month (YYYY-MM) based on sentAt
      const monthMap = new Map<string, number>();
      emailSends.forEach((emailSend) => {
        if (emailSend.sentAt) {
          const date = new Date(emailSend.sentAt);
          const year = date.getUTCFullYear();
          const month = String(date.getUTCMonth() + 1).padStart(2, "0");
          const monthKey = `${year}-${month}`;
          monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + 1);
        }
      });

      const months = Array.from(monthMap.entries())
        .map(([month, count]) => ({
          month,
          count,
        }))
        .sort((a, b) => b.month.localeCompare(a.month)); // Most recent first

      return NextResponse.json({ months });
    }

    // If specific day is provided (YYYY-MM-DD), return invoices for that date
    if (dateParam) {
      const [y, m, d] = dateParam.split("-").map(Number);
      if (!y || !m || !d || m < 1 || m > 12 || d < 1 || d > 31) {
        return NextResponse.json(
          { error: "არასწორი თარიღი (გამოიყენეთ YYYY-MM-DD)" },
          { status: 400 }
        );
      }

      const start = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
      const end = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));

      const invoices = await prisma.adminInvoice.findMany({
        where: {
          createdAt: {
            gte: start,
            lte: end,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      const totalAmount = invoices.reduce((sum, inv) => sum + (inv.totalAmount ?? inv.amount ?? 0), 0);
      const totalWeightKg = invoices.reduce((sum, inv) => sum + (inv.totalWeightKg ?? 0), 0);
      const totalProtectors = invoices.reduce((sum, inv) => sum + (inv.protectorsAmount ?? 0), 0);

      return NextResponse.json({
        date: dateParam,
        count: invoices.length,
        totalAmount,
        totalWeightKg,
        totalProtectors,
        invoices,
      });
    }

    // If search query is provided, search by customer name across all invoices
    if (searchQuery) {
      // Use raw query for case-insensitive search in PostgreSQL
      const invoices = await prisma.$queryRaw<Array<{
        id: string;
        invoiceNumber: string;
        customerName: string;
        customerEmail: string | null;
        amount: number;
        totalWeightKg: number | null;
        protectorsAmount: number | null;
        totalAmount: number | null;
        status: string;
        dueDate: Date;
        createdAt: Date;
        updatedAt: Date;
      }>>`
        SELECT * FROM "AdminInvoice"
        WHERE LOWER("customerName") LIKE LOWER(${`%${searchQuery}%`})
        ORDER BY "createdAt" DESC
      `;

      const totalAmount = invoices.reduce((sum, inv) => sum + (inv.totalAmount ?? inv.amount ?? 0), 0);
      const totalWeightKg = invoices.reduce((sum, inv) => sum + (inv.totalWeightKg ?? 0), 0);
      const totalProtectors = invoices.reduce((sum, inv) => sum + (inv.protectorsAmount ?? 0), 0);

      return NextResponse.json({
        search: searchQuery,
        count: invoices.length,
        totalAmount,
        totalWeightKg,
        totalProtectors,
        invoices,
      });
    }

    // If month is provided (YYYY-MM), return archived invoices for that month
    if (monthParam) {
      const [y, m] = monthParam.split("-").map(Number);
      if (!y || !m || m < 1 || m > 12) {
        return NextResponse.json(
          { error: "არასწორი თვე (გამოიყენეთ YYYY-MM)" },
          { status: 400 }
        );
      }

      const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
      const end = new Date(Date.UTC(m === 12 ? y + 1 : y, m === 12 ? 0 : m, 1, 0, 0, 0, 0));

      const invoices = await prisma.invoice.findMany({
        where: {
          createdAt: {
            gte: start,
            lt: end,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      const totalAmount = invoices.reduce((sum, inv) => sum + (inv.totalAmount ?? inv.amount ?? 0), 0);
      const totalWeightKg = invoices.reduce((sum, inv) => sum + (inv.totalWeightKg ?? 0), 0);
      const totalProtectors = invoices.reduce((sum, inv) => sum + (inv.protectorsAmount ?? 0), 0);

      return NextResponse.json({
        month: monthParam,
        count: invoices.length,
        totalAmount,
        totalWeightKg,
        totalProtectors,
        invoices,
      });
    }

    // Get all email sends from sheets that have been emailed
    // Filter by month if emailSendsMonth parameter is provided (YYYY-MM format)
    let emailSendsWhere: any = {};
    if (emailSendsMonthParam) {
      const [y, m] = emailSendsMonthParam.split("-").map(Number);
      if (y && m && m >= 1 && m <= 12) {
        const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
        const end = new Date(Date.UTC(m === 12 ? y + 1 : y, m === 12 ? 0 : m, 1, 0, 0, 0, 0));
        emailSendsWhere = {
          sentAt: {
            gte: start,
            lt: end,
          },
        };
      }
    }

    const [legalEmailSends, physicalEmailSends] = await Promise.all([
      prisma.legalDailySheetEmailSend.findMany({
        where: emailSendsWhere,
        include: {
          dailySheet: {
            include: {
              items: true,
            },
          },
        },
        orderBy: {
          sentAt: "desc",
        },
      }),
      prisma.physicalDailySheetEmailSend.findMany({
        where: emailSendsWhere,
        include: {
          dailySheet: {
            include: {
              items: true,
            },
          },
        },
        orderBy: {
          sentAt: "desc",
        },
      }),
    ]);
    const emailSends = [...legalEmailSends, ...physicalEmailSends];

    // Normalize hotel name function
    const normalizeHotel = (name: string | null) => {
      if (!name) return "-";
      return name.trim().replace(/\s+/g, " ").toLowerCase();
    };

    // Create invoice entries from email sends
    const invoiceEntries = emailSends.map((emailSend) => {
      const sheet = emailSend.dailySheet;

      // Use values from DailySheetEmailSend record
      const emailWeight = emailSend.totalWeight ?? 0;
      const emailProtectorsAmount = emailSend.protectorsAmount ?? 0;
      const emailTotalAmount = emailSend.totalAmount ?? 0;

      // Track each email send separately - use UTC methods to avoid timezone issues
      const dateObj = new Date(emailSend.date);
      // Get year, month, day in UTC to ensure consistent date formatting
      const year = dateObj.getUTCFullYear();
      const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getUTCDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`;
      
      const hotelKey = normalizeHotel(emailSend.hotelName);
      
      // Calculate dispatched count from sheet items
      const totals = sheet.items.reduce(
        (acc, item) => {
          // Treat dispatched as the max known count (fallback to received/washCount when 0 or null)
          const dispatched =
            (item.dispatched && item.dispatched > 0
              ? item.dispatched
              : item.received && item.received > 0
              ? item.received
              : item.washCount || 0) ?? 0;

          return {
            dispatched: acc.dispatched + dispatched,
          };
        },
        { dispatched: 0 }
      );
      
      // Get confirmation status from emailSend (not dailySheet)
      const confirmedAt = emailSend.confirmedAt ? emailSend.confirmedAt.toISOString() : null;
      
      // Each emailSend is a separate invoice entry with a single date detail
      return {
        hotelName: hotelKey === "-" ? null : hotelKey,
        displayHotelName: emailSend.hotelName?.trim() || null,
        sheetCount: 1, // Each invoice represents one sheet
        totalDispatched: totals.dispatched,
        totalWeightKg: emailWeight,
        protectorsAmount: emailProtectorsAmount,
        totalAmount: emailTotalAmount,
        totalEmailSendCount: 1, // Each invoice has one email send
        dateDetails: [{
          date: dateKey,
          emailSendCount: 1,
          weightKg: emailWeight,
          protectorsAmount: emailProtectorsAmount,
          totalAmount: emailTotalAmount,
          sentAt: emailSend.sentAt ? emailSend.sentAt.toISOString() : null,
          confirmedAt: confirmedAt,
          emailSendIds: [emailSend.id], // Each invoice detail has only one emailSend ID
        }],
      };
    });

    // Group invoices by hotel name (normalized)
    const hotelGroups = new Map<string, typeof invoiceEntries>();
    
    invoiceEntries.forEach((invoice) => {
      const hotelKey = invoice.hotelName || "-";
      if (!hotelGroups.has(hotelKey)) {
        hotelGroups.set(hotelKey, []);
      }
      hotelGroups.get(hotelKey)!.push(invoice);
    });

    // Combine invoices for the same hotel
    const invoices = Array.from(hotelGroups.entries()).map(([hotelKey, hotelInvoices]) => {
      // Use the first invoice's displayHotelName (preserve original casing)
      const displayHotelName = hotelInvoices[0]?.displayHotelName || null;
      
      // Combine all dateDetails from all invoices for this hotel
      const allDateDetails = hotelInvoices.flatMap(inv => inv.dateDetails || []);
      
      // Sort dateDetails by date (most recent first)
      allDateDetails.sort((a, b) => {
        const dateA = a.date;
        const dateB = b.date;
        if (dateA && dateB) {
          return dateB.localeCompare(dateA);
        }
        return 0;
      });
      
      // Sum up all totals
      const combined = hotelInvoices.reduce((acc, inv) => ({
        sheetCount: acc.sheetCount + (inv.sheetCount || 0),
        totalDispatched: acc.totalDispatched + (inv.totalDispatched || 0),
        totalWeightKg: acc.totalWeightKg + (inv.totalWeightKg || 0),
        protectorsAmount: acc.protectorsAmount + (inv.protectorsAmount || 0),
        totalAmount: acc.totalAmount + (inv.totalAmount || 0),
        totalEmailSendCount: acc.totalEmailSendCount + (inv.totalEmailSendCount || 0),
      }), {
        sheetCount: 0,
        totalDispatched: 0,
        totalWeightKg: 0,
        protectorsAmount: 0,
        totalAmount: 0,
        totalEmailSendCount: 0,
      });
      
      return {
        hotelName: hotelKey === "-" ? null : hotelKey,
        displayHotelName: displayHotelName,
        sheetCount: combined.sheetCount,
        totalDispatched: combined.totalDispatched,
        totalWeightKg: combined.totalWeightKg,
        protectorsAmount: combined.protectorsAmount,
        totalAmount: combined.totalAmount,
        totalEmailSendCount: combined.totalEmailSendCount,
        dateDetails: allDateDetails,
      };
    });

    // Sort by hotel name, then by most recent sentAt
    const sorted = invoices.sort((a, b) => {
      const hA = a.displayHotelName || a.hotelName || "";
      const hB = b.displayHotelName || b.hotelName || "";
      const hotelCompare = hA.localeCompare(hB);
      if (hotelCompare !== 0) return hotelCompare;
      
      // If same hotel, sort by most recent sentAt
      const sentAtA = a.dateDetails[0]?.sentAt;
      const sentAtB = b.dateDetails[0]?.sentAt;
      if (sentAtA && sentAtB) {
        return sentAtB.localeCompare(sentAtA);
      }
      return 0;
    });

    return NextResponse.json(sorted);
  } catch (error) {
    console.error("Invoices fetch error:", error);
    return NextResponse.json(
      { error: "ინვოისების ჩატვირთვისას მოხდა შეცდომა" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "არ არის ავტორიზებული" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || (user.role !== "ADMIN" && user.role !== "MANAGER" && user.role !== "MANAGER_ASSISTANT")) {
      return NextResponse.json(
        { error: "დაუშვებელია" },
        { status: 403 }
      );
    }

    // Check if request body contains emailSendIds (for specific invoice deletion)
    let emailSendIds: string[] | undefined;
    try {
      const body = await request.json().catch(() => null);
      if (body && Array.isArray(body.emailSendIds) && body.emailSendIds.length > 0) {
        emailSendIds = body.emailSendIds;
      }
    } catch {
      // If body parsing fails, continue with query params
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");
    const hotelNameParam = searchParams.get("hotelName");
    const clearAll = searchParams.get("all") === "true";

    // If emailSendIds are provided, delete only those specific email sends
    if (emailSendIds && emailSendIds.length > 0) {
      const emailSendDeleteResult = await prisma.dailySheetEmailSend.deleteMany({
        where: {
          id: {
            in: emailSendIds,
          },
        },
      });

      // Also update related daily sheets
      const relatedSheets = await prisma.dailySheetEmailSend.findMany({
        where: {
          id: {
            in: emailSendIds,
          },
        },
        select: {
          dailySheetId: true,
        },
      });

      const sheetIds = [...new Set(relatedSheets.map(es => es.dailySheetId))];
      
      // Check if any sheets have remaining email sends
      for (const sheetId of sheetIds) {
        const remainingEmailSends = await prisma.dailySheetEmailSend.count({
          where: {
            dailySheetId: sheetId,
          },
        });

        if (remainingEmailSends === 0) {
          // No more email sends for this sheet, clear emailedAt
          await prisma.dailySheet.update({
            where: { id: sheetId },
            data: { emailedAt: null, emailedTo: null, emailSendCount: 0 },
          });
        } else {
          // Update emailSendCount
          await prisma.dailySheet.update({
            where: { id: sheetId },
            data: { emailSendCount: remainingEmailSends },
          });
        }
      }

      return NextResponse.json({
        deletedEmailSends: emailSendDeleteResult.count,
        message: "ინვოისი წაიშალა",
      });
    }

    if (!clearAll && !dateParam && !hotelNameParam) {
      return NextResponse.json(
        { error: "მიუთითეთ date=YYYY-MM-DD, hotelName=სასტუმროს_სახელი, all=true ან emailSendIds array" },
        { status: 400 }
      );
    }

    // Normalize hotel name function (same as GET endpoint)
    const normalizeHotel = (name: string | null) => {
      if (!name) return "-";
      return name.trim().replace(/\s+/g, " ").toLowerCase();
    };

    // Build where clause for DailySheetEmailSend deletion
    let emailSendWhereClause: any = {};
    let matchingEmailSendIds: string[] = [];
    let matchingSheetIds: string[] = [];

    if (hotelNameParam && !clearAll) {
      // Use case-insensitive search to match hotel names regardless of case/spacing
      const normalizedSearchName = normalizeHotel(hotelNameParam);
      
      // Find all matching email sends with case-insensitive hotel name (both legal and physical)
      const [legalEmailSends, physicalEmailSends] = await Promise.all([
        prisma.legalDailySheetEmailSend.findMany({
          where: {
            hotelName: {
              not: null,
            },
          },
          select: {
            id: true,
            hotelName: true,
          },
        }),
        prisma.physicalDailySheetEmailSend.findMany({
          where: {
            hotelName: {
              not: null,
            },
          },
          select: {
            id: true,
            hotelName: true,
          },
        }),
      ]);
      const allEmailSends = [...legalEmailSends, ...physicalEmailSends];
      
      // Find IDs of records that match after normalization
      matchingEmailSendIds = allEmailSends
        .filter((es) => normalizeHotel(es.hotelName) === normalizedSearchName)
        .map((es) => es.id);

      if (matchingEmailSendIds.length === 0) {
        return NextResponse.json({
          deletedEmailSends: 0,
          updatedSheets: 0,
          message: "მონაცემები არ მოიძებნა",
        });
      }

      emailSendWhereClause = {
        id: {
          in: matchingEmailSendIds,
        },
      };

      // Also find matching sheets for updating (both legal and physical)
      const [legalSheets, physicalSheets] = await Promise.all([
        prisma.legalDailySheet.findMany({
          where: {
            hotelName: {
              not: null,
            },
            emailedAt: {
              not: null,
            },
          },
          select: {
            id: true,
            hotelName: true,
          },
        }),
        prisma.physicalDailySheet.findMany({
          where: {
            hotelName: {
              not: null,
            },
            emailedAt: {
              not: null,
            },
          },
          select: {
            id: true,
            hotelName: true,
          },
        }),
      ]);
      const allSheets = [...legalSheets, ...physicalSheets];

      matchingSheetIds = allSheets
        .filter((sheet) => normalizeHotel(sheet.hotelName) === normalizedSearchName)
        .map((sheet) => sheet.id);
    } else if (dateParam && !clearAll) {
      const [y, m, d] = dateParam.split("-").map(Number);
      if (!y || !m || !d) {
        return NextResponse.json(
          { error: "არასწორი თარიღი (გამოიყენეთ YYYY-MM-DD)" },
          { status: 400 }
        );
      }
      const start = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
      const end = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
      emailSendWhereClause = {
        date: {
          gte: start,
          lte: end,
        },
      };
    }

    // Delete DailySheetEmailSend records (this is what the GET endpoint uses)
    const emailSendDeleteResult = await prisma.dailySheetEmailSend.deleteMany({
      where: emailSendWhereClause,
    });

    console.log("Delete invoices - Email sends deleted:", emailSendDeleteResult.count, "Where clause:", JSON.stringify(emailSendWhereClause));

    // Also clear emailedAt and emailedTo from dailySheet records
    let sheetWhereClause: any = {
      emailedAt: {
        not: null,
      },
    };

    if (hotelNameParam && !clearAll) {
      // Use the matching sheet IDs we already found
      if (matchingSheetIds.length === 0) {
        // If no matching sheets, still return the email send deletion result
        return NextResponse.json({
          deletedEmailSends: emailSendDeleteResult.count,
          updatedSheets: 0,
        });
      }

      sheetWhereClause = {
        ...sheetWhereClause,
        id: {
          in: matchingSheetIds,
        },
      };
    } else if (dateParam && !clearAll) {
      const [y, m, d] = dateParam.split("-").map(Number);
      const start = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
      const end = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
      sheetWhereClause = {
        ...sheetWhereClause,
        date: {
          gte: start,
          lte: end,
        },
      };
    }

    // Update both legal and physical daily sheets
    const [legalSheetUpdateResult, physicalSheetUpdateResult] = await Promise.all([
      prisma.legalDailySheet.updateMany({
        where: sheetWhereClause,
        data: { emailedAt: null, emailedTo: null, emailSendCount: 0 },
      }),
      prisma.physicalDailySheet.updateMany({
        where: sheetWhereClause,
        data: { emailedAt: null, emailedTo: null, emailSendCount: 0 },
      }),
    ]);
    const sheetUpdateResult = {
      count: legalSheetUpdateResult.count + physicalSheetUpdateResult.count,
    };

    console.log("Delete invoices - Sheets updated:", sheetUpdateResult.count, "Where clause:", JSON.stringify(sheetWhereClause));

    return NextResponse.json({ 
      deletedEmailSends: emailSendDeleteResult.count,
      updatedSheets: sheetUpdateResult.count 
    });
  } catch (error) {
    console.error("Invoices delete error:", error);
    return NextResponse.json(
      { error: "ინვოისების წაშლისას მოხდა შეცდომა" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "არ არის ავტორიზებული" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || (user.role !== "ADMIN" && user.role !== "MANAGER" && user.role !== "MANAGER_ASSISTANT")) {
      return NextResponse.json(
        { error: "დაუშვებელია" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { invoiceNumber, customerName, customerEmail, amount, status, dueDate } = body;

    // Check if invoice number already exists in AdminInvoice table
    const existing = await prisma.adminInvoice.findUnique({
      where: { invoiceNumber },
    });

    if (existing) {
      return NextResponse.json(
        { error: "ინვოისის ნომერი უკვე არსებობს" },
        { status: 400 }
      );
    }

    // Create AdminInvoice
    const invoice = await prisma.adminInvoice.create({
      data: {
        invoiceNumber,
        customerName,
        customerEmail: customerEmail || null,
        amount,
        status,
        dueDate: new Date(dueDate),
      },
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error("Invoice create error:", error);
    return NextResponse.json(
      { error: "ინვოისის დამატებისას მოხდა შეცდომა" },
      { status: 500 }
    );
  }
}


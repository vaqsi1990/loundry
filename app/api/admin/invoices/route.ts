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

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "დაუშვებელია" },
        { status: 403 }
      );
    }

    // Get all email sends from sheets that have been emailed
    const emailSends = await prisma.dailySheetEmailSend.findMany({
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
    });

    // Aggregate by normalized hotel name to provide a grouped invoice-style summary
    const normalizeHotel = (name: string | null) => {
      if (!name) return "-";
      return name.trim().replace(/\s+/g, " ").toLowerCase();
    };

    const aggregateMap = new Map<
      string,
      {
        hotelName: string | null;
        displayHotelName: string | null;
        sheetCount: number;
        totalDispatched: number;
        totalWeightKg: number;
        protectorsAmount: number;
        totalAmount: number;
        totalEmailSendCount: number;
        sheetIds: Set<string>; // Track unique sheets
        sheetDispatched: Map<string, number>; // Track dispatched count per sheet (to avoid double counting)
        dateDetails: Map<string, { // Track details by date
          date: string;
          emailSendCount: number;
          weightKg: number;
          protectorsAmount: number;
          totalAmount: number;
        }>;
      }
    >();

    emailSends.forEach((emailSend) => {
      const hotelKey = normalizeHotel(emailSend.hotelName);
      const sheet = emailSend.dailySheet;

      const current = aggregateMap.get(hotelKey) ?? {
        hotelName: hotelKey === "-" ? null : hotelKey,
        displayHotelName: emailSend.hotelName?.trim() || null,
        sheetCount: 0,
        totalDispatched: 0,
        totalWeightKg: 0,
        protectorsAmount: 0,
        totalAmount: 0,
        totalEmailSendCount: 0,
        sheetIds: new Set<string>(),
        sheetDispatched: new Map<string, number>(),
        dateDetails: new Map<string, { date: string; emailSendCount: number; weightKg: number; protectorsAmount: number; totalAmount: number }>(),
      };

      // Calculate dispatched count from sheet items (only once per sheet)
      if (!current.sheetDispatched.has(sheet.id)) {
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
        current.sheetDispatched.set(sheet.id, totals.dispatched);
      }

      // Use values from DailySheetEmailSend record
      const emailWeight = emailSend.totalWeight ?? 0;
      const emailProtectorsAmount = emailSend.protectorsAmount ?? 0;
      const emailTotalAmount = emailSend.totalAmount ?? 0;

      // Track unique sheets
      current.sheetIds.add(sheet.id);

      // Track details by date
      const dateKey = new Date(emailSend.date).toISOString().split("T")[0];
      const dateDetail = current.dateDetails.get(dateKey) ?? {
        date: dateKey,
        emailSendCount: 0,
        weightKg: 0,
        protectorsAmount: 0,
        totalAmount: 0,
      };
      dateDetail.emailSendCount += 1;
      dateDetail.weightKg += emailWeight;
      dateDetail.protectorsAmount += emailProtectorsAmount;
      dateDetail.totalAmount += emailTotalAmount;
      current.dateDetails.set(dateKey, dateDetail);

      aggregateMap.set(hotelKey, {
        hotelName: hotelKey === "-" ? null : hotelKey,
        displayHotelName: current.displayHotelName || emailSend.hotelName?.trim() || null,
        sheetCount: current.sheetIds.size,
        totalDispatched: Array.from(current.sheetDispatched.values()).reduce((sum, val) => sum + val, 0),
        // Use weight, protectors amount, and total amount from DailySheetEmailSend
        totalWeightKg: current.totalWeightKg + emailWeight,
        protectorsAmount: current.protectorsAmount + emailProtectorsAmount,
        totalAmount: current.totalAmount + emailTotalAmount,
        totalEmailSendCount: current.totalEmailSendCount + 1,
        sheetIds: current.sheetIds,
        sheetDispatched: current.sheetDispatched,
        dateDetails: current.dateDetails,
      });
    });

    const aggregated = Array.from(aggregateMap.values())
      .map(({ sheetIds, sheetDispatched, dateDetails, ...rest }) => ({
        ...rest,
        dateDetails: Array.from(dateDetails.values()).sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        ),
      })) // Convert dateDetails Map to sorted array
      .sort((a, b) => {
        const hA = a.displayHotelName || a.hotelName || "";
        const hB = b.displayHotelName || b.hotelName || "";
        return hA.localeCompare(hB);
      });

    return NextResponse.json(aggregated);
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

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "დაუშვებელია" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");
    const clearAll = searchParams.get("all") === "true";

    if (!clearAll && !dateParam) {
      return NextResponse.json(
        { error: "მიუთითეთ date=YYYY-MM-DD ან all=true" },
        { status: 400 }
      );
    }

    let whereClause: any = {
      emailedAt: {
        not: null,
      },
    };

    if (dateParam && !clearAll) {
      const [y, m, d] = dateParam.split("-").map(Number);
      if (!y || !m || !d) {
        return NextResponse.json(
          { error: "არასწორი თარიღი (გამოიყენეთ YYYY-MM-DD)" },
          { status: 400 }
        );
      }
      const start = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
      const end = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
      whereClause = {
        ...whereClause,
        date: {
          gte: start,
          lte: end,
        },
      };
    }

    const result = await prisma.dailySheet.updateMany({
      where: whereClause,
      data: { emailedAt: null, emailedTo: null },
    });

    return NextResponse.json({ updated: result.count });
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

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "დაუშვებელია" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { invoiceNumber, customerName, customerEmail, amount, status, dueDate } = body;

    // Check if invoice number already exists
    const existing = await prisma.invoice.findUnique({
      where: { invoiceNumber },
    });

    if (existing) {
      return NextResponse.json(
        { error: "ინვოისის ნომერი უკვე არსებობს" },
        { status: 400 }
      );
    }

    const invoice = await prisma.invoice.create({
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


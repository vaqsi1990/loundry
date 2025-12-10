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

    const sheets = await prisma.dailySheet.findMany({
      where: {
        emailedAt: {
          not: null,
        },
      },
      include: {
        items: true,
        emailSends: true,
      },
      orderBy: {
        emailedAt: "desc",
      },
    });

    // Aggregate daily sheets by normalized hotel name to provide a grouped invoice-style summary
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
      }
    >();

    sheets.forEach((sheet) => {
      const hotelKey = normalizeHotel(sheet.hotelName);
      const hasProtectors = sheet.items.some((item) => item.category === "PROTECTORS");
      const hasLinenOrTowels = sheet.items.some(
        (item) => item.category === "LINEN" || item.category === "TOWELS"
      );

      // Aggregate counts; track total weight for display and a linen/towel-only weight for price
      const totals = sheet.items.reduce(
        (acc, item) => {
          // Treat dispatched as the max known count (fallback to received/washCount when 0 or null)
          const dispatched =
            (item.dispatched && item.dispatched > 0
              ? item.dispatched
              : item.received && item.received > 0
              ? item.received
              : item.washCount || 0) ?? 0;
          const weight = item.totalWeight ?? item.weight ?? 0;
          const isProtector = item.category === "PROTECTORS";

          return {
            dispatched: acc.dispatched + dispatched,
            totalWeight: acc.totalWeight + weight,
            linenTowelWeight: acc.linenTowelWeight + (isProtector ? 0 : weight),
          };
        },
        { dispatched: 0, totalWeight: 0, linenTowelWeight: 0 }
      );

      // Weight used for linen/towels price calculation
      const weightForPrice =
        sheet.sheetType === "STANDARD" && sheet.totalWeight
          ? sheet.totalWeight
          : totals.linenTowelWeight;

      // Calculate linen/towels amount (price per kg * weight)
      const linenTowelsAmount =
        hasLinenOrTowels && sheet.pricePerKg && weightForPrice
          ? sheet.pricePerKg * weightForPrice
          : 0;

      // Calculate protectors amount
      let protectorsAmount = 0;
      if (hasProtectors) {
        if (sheet.sheetType === "STANDARD" && sheet.totalPrice) {
          protectorsAmount = sheet.totalPrice;
        } else {
          protectorsAmount = sheet.items
            .filter((item) => item.category === "PROTECTORS")
            .reduce((sum, item) => {
              const pricePerItem =
                item.price ??
                PROTECTOR_PRICES[item.itemNameKa] ??
                0;
              // Use received quantity (align with DailySheetsSection)
              const quantity = item.received ?? 0;
              return sum + pricePerItem * quantity;
            }, 0);
        }
      }

      const totalAmount = linenTowelsAmount + protectorsAmount;

      const current = aggregateMap.get(hotelKey) ?? {
        hotelName: hotelKey === "-" ? null : hotelKey,
        displayHotelName: sheet.hotelName?.trim() || null,
        sheetCount: 0,
        totalDispatched: 0,
        totalWeightKg: 0,
        protectorsAmount: 0,
        totalAmount: 0,
        totalEmailSendCount: 0,
      };

      aggregateMap.set(hotelKey, {
        hotelName: hotelKey === "-" ? null : hotelKey,
        displayHotelName: current.displayHotelName || sheet.hotelName?.trim() || null,
        sheetCount: current.sheetCount + 1,
        totalDispatched: current.totalDispatched + totals.dispatched,
        // For display we sum raw totalWeight (align with DailySheetsSection totals)
        totalWeightKg: current.totalWeightKg + (totals.totalWeight || 0),
        protectorsAmount: current.protectorsAmount + protectorsAmount,
        totalAmount: current.totalAmount + totalAmount,
        totalEmailSendCount: current.totalEmailSendCount + (sheet.emailSends?.length ?? 0),
      });
    });

    const aggregated = Array.from(aggregateMap.values()).sort((a, b) => {
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


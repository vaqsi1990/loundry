import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

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
      },
      orderBy: {
        emailedAt: "desc",
      },
    });

    // Aggregate daily sheets by date to provide a day-level invoice-style summary
    const aggregateMap = new Map<
      string,
      {
        date: string;
        sheetCount: number;
        totalDispatched: number;
        totalWeightKg: number;
        protectorsAmount: number;
        totalAmount: number;
      }
    >();

    sheets.forEach((sheet) => {
      const dateKey = sheet.date.toISOString().split("T")[0]; // YYYY-MM-DD
      const hasProtectors = sheet.items.some((item) => item.category === "PROTECTORS");
      const hasLinenOrTowels = sheet.items.some(
        (item) => item.category === "LINEN" || item.category === "TOWELS"
      );

      // Aggregate using actually dispatched quantities
      const totals = sheet.items.reduce(
        (acc, item) => ({
          dispatched: acc.dispatched + (item.dispatched || 0),
          totalWeight: acc.totalWeight + ((item.weight || 0) * (item.dispatched || 0)),
        }),
        { dispatched: 0, totalWeight: 0 }
      );

      // Weight used for linen/towels price calculation
      const weightForPrice =
        sheet.sheetType === "STANDARD" && sheet.totalWeight
          ? sheet.totalWeight
          : totals.totalWeight;

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
              const pricePerItem = item.price ?? 0;
              // Count sent protectors by dispatched quantity; fallback to received if dispatched is missing
              const quantity = item.dispatched ?? item.received ?? 0;
              return sum + pricePerItem * quantity;
            }, 0);
        }
      }

      const totalAmount = linenTowelsAmount + protectorsAmount;

      const current = aggregateMap.get(dateKey) ?? {
        date: dateKey,
        sheetCount: 0,
        totalDispatched: 0,
        totalWeightKg: 0,
        protectorsAmount: 0,
        totalAmount: 0,
      };

      aggregateMap.set(dateKey, {
        date: dateKey,
        sheetCount: current.sheetCount + 1,
        totalDispatched: current.totalDispatched + totals.dispatched,
        totalWeightKg: current.totalWeightKg + (weightForPrice || 0),
        protectorsAmount: current.protectorsAmount + protectorsAmount,
        totalAmount: current.totalAmount + totalAmount,
      });
    });

    const aggregated = Array.from(aggregateMap.values()).sort((a, b) =>
      b.date.localeCompare(a.date)
    );

    return NextResponse.json(aggregated);
  } catch (error) {
    console.error("Invoices fetch error:", error);
    return NextResponse.json(
      { error: "ინვოისების ჩატვირთვისას მოხდა შეცდომა" },
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


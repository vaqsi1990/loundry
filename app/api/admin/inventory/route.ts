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

    if (!user || (user.role !== "ADMIN" && user.role !== "MANAGER" && user.role !== "MANAGER_ASSISTANT")) {
      return NextResponse.json(
        { error: "დაუშვებელია" },
        { status: 403 }
      );
    }

    // Get month filter from query parameters
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month"); // Format: "YYYY-MM"

    let whereClause: any = {};

    // Filter by month if provided
    if (month) {
      const [year, monthNum] = month.split("-").map(Number);
      const startDate = new Date(year, monthNum - 1, 1);
      const endDate = new Date(year, monthNum, 0, 23, 59, 59, 999);

      whereClause.receiptDate = {
        gte: startDate,
        lte: endDate,
      };
    }

    const items = await prisma.inventory.findMany({
      where: whereClause,
      include: {
        movements: {
          orderBy: {
            date: "desc",
          },
        },
      },
      orderBy: {
        itemName: "asc",
      },
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error("Inventory fetch error:", error);
    return NextResponse.json(
      { error: "საწყობის ჩატვირთვისას მოხდა შეცდომა" },
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
    const { itemName, category, quantity, unit, unitPrice, supplier, receiptDate } = body;

    const receiptDateValue = receiptDate ? new Date(receiptDate) : new Date();

    const item = await prisma.inventory.create({
      data: {
        itemName,
        category: category || null,
        quantity,
        unit,
        unitPrice: unitPrice || null,
        supplier: supplier || null,
        receiptDate: receiptDateValue,
        movements: {
          create: {
            type: "RECEIPT",
            quantity: quantity,
            date: receiptDateValue,
            notes: "საწყობში დამატება",
          },
        },
      },
      include: {
        movements: true,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("Inventory create error:", error);
    return NextResponse.json(
      { error: "პროდუქტის დამატებისას მოხდა შეცდომა" },
      { status: 500 }
    );
  }
}


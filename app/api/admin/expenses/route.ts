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

    const { searchParams } = new URL(request.url);
    const view = searchParams.get("view");
    const date = searchParams.get("date");
    const month = searchParams.get("month");
    const monthsOnly = searchParams.get("months") === "true";

    // If months=true, return all available months with expense counts
    if (monthsOnly) {
      const expenses = await prisma.expense.findMany({
        select: {
          date: true,
        },
        orderBy: {
          date: "desc",
        },
      });

      // Group by month (YYYY-MM)
      const monthMap = new Map<string, number>();
      expenses.forEach((exp) => {
        const date = new Date(exp.date);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const monthKey = `${year}-${month}`;
        monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + 1);
      });

      const months = Array.from(monthMap.entries())
        .map(([month, count]) => ({
          month,
          count,
        }))
        .sort((a, b) => b.month.localeCompare(a.month)); // Most recent first

      return NextResponse.json({ months });
    }

    let where: any = {};

    if (view === "daily" && date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      where.date = {
        gte: startOfDay,
        lte: endOfDay,
      };
    } else if (view === "monthly" && month) {
      const startOfMonth = new Date(`${month}-01`);
      const endOfMonth = new Date(startOfMonth);
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);
      endOfMonth.setDate(0);
      endOfMonth.setHours(23, 59, 59, 999);
      where.date = {
        gte: startOfMonth,
        lte: endOfMonth,
      };
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        inventory: {
          select: {
            id: true,
            itemName: true,
            category: true,
            unit: true,
            unitPrice: true,
          },
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    return NextResponse.json(expenses);
  } catch (error) {
    console.error("Expenses fetch error:", error);
    return NextResponse.json(
      { error: "ხარჯების ჩატვირთვისას მოხდა შეცდომა" },
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
    const { category, description, amount, date, isRecurring, excludeFromCalculator, inventoryId } = body;

    const expense = await prisma.expense.create({
      data: {
        category,
        description,
        amount,
        date: new Date(date),
        isRecurring: isRecurring || false,
        excludeFromCalculator: excludeFromCalculator || false,
        inventoryId: inventoryId || null,
      },
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error("Expense create error:", error);
    return NextResponse.json(
      { error: "ხარჯის დამატებისას მოხდა შეცდომა" },
      { status: 500 }
    );
  }
}


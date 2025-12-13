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

    const { searchParams } = new URL(request.url);
    const period1 = searchParams.get("period1");
    const period2 = searchParams.get("period2");
    const view = searchParams.get("view");

    if (!period1 || !period2) {
      return NextResponse.json(
        { error: "ორივე პერიოდი უნდა იყოს მითითებული" },
        { status: 400 }
      );
    }

    const statistics: Array<{
      period: string;
      revenues: number;
      expenses: number;
      netIncome: number;
    }> = [];

    const getPeriodData = async (period: string) => {
      if (view === "monthly") {
        const [year, month] = period.split("-").map(Number);
        // Create dates - use local timezone to match how dates are stored
        const startOfMonth = new Date(year, month - 1, 1);
        startOfMonth.setHours(0, 0, 0, 0);
        const endOfMonth = new Date(year, month, 0);
        endOfMonth.setHours(23, 59, 59, 999);

        const [revenues, expenses, invoices] = await Promise.all([
          prisma.revenue.aggregate({
            where: {
              date: {
                gte: startOfMonth,
                lte: endOfMonth,
              },
            },
            _sum: {
              amount: true,
            },
          }),
          prisma.expense.aggregate({
            where: {
              date: {
                gte: startOfMonth,
                lte: endOfMonth,
              },
            },
            _sum: {
              amount: true,
            },
          }),
          prisma.invoice.findMany({
            where: {
              createdAt: {
                gte: startOfMonth,
                lte: endOfMonth,
              },
              paidAmount: {
                not: null,
                gt: 0,
              },
            },
            select: {
              paidAmount: true,
            },
          }),
        ]);

        const monthNames = [
          "იანვარი", "თებერვალი", "მარტი", "აპრილი", "მაისი", "ივნისი",
          "ივლისი", "აგვისტო", "სექტემბერი", "ოქტომბერი", "ნოემბერი", "დეკემბერი"
        ];

        const totalRevenues = (revenues._sum.amount || 0) + 
          (invoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0));
        const totalExpenses = expenses._sum.amount || 0;

        return {
          period: `${monthNames[month - 1]} ${year}`,
          revenues: totalRevenues,
          expenses: totalExpenses,
          netIncome: totalRevenues - totalExpenses,
        };
      } else {
        const year = parseInt(period);
        // Create dates - use local timezone to match how dates are stored
        const startOfYear = new Date(year, 0, 1);
        startOfYear.setHours(0, 0, 0, 0);
        const endOfYear = new Date(year, 11, 31);
        endOfYear.setHours(23, 59, 59, 999);

        const [revenues, expenses, invoices] = await Promise.all([
          prisma.revenue.aggregate({
            where: {
              date: {
                gte: startOfYear,
                lte: endOfYear,
              },
            },
            _sum: {
              amount: true,
            },
          }),
          prisma.expense.aggregate({
            where: {
              date: {
                gte: startOfYear,
                lte: endOfYear,
              },
            },
            _sum: {
              amount: true,
            },
          }),
          prisma.invoice.findMany({
            where: {
              createdAt: {
                gte: startOfYear,
                lte: endOfYear,
              },
              paidAmount: {
                not: null,
                gt: 0,
              },
            },
            select: {
              paidAmount: true,
            },
          }),
        ]);

        const totalRevenues = (revenues._sum.amount || 0) + 
          (invoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0));
        const totalExpenses = expenses._sum.amount || 0;

        return {
          period: year.toString(),
          revenues: totalRevenues,
          expenses: totalExpenses,
          netIncome: totalRevenues - totalExpenses,
        };
      }
    };

    const [data1, data2] = await Promise.all([
      getPeriodData(period1),
      getPeriodData(period2),
    ]);

    // Only add periods that have actual data
    if (data1.revenues > 0 || data1.expenses > 0) {
      statistics.push(data1);
    }
    if (data2.revenues > 0 || data2.expenses > 0) {
      statistics.push(data2);
    }

    return NextResponse.json(statistics);
  } catch (error) {
    console.error("Statistics compare error:", error);
    return NextResponse.json(
      { error: "შედარებისას მოხდა შეცდომა" },
      { status: 500 }
    );
  }
}


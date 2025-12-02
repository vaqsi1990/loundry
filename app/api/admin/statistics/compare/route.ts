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
        // Create dates in UTC to avoid timezone issues
        const startOfMonth = new Date(Date.UTC(year, month - 1, 1));
        const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

        const [revenues, expenses] = await Promise.all([
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
        ]);

        const monthNames = [
          "იანვარი", "თებერვალი", "მარტი", "აპრილი", "მაისი", "ივნისი",
          "ივლისი", "აგვისტო", "სექტემბერი", "ოქტომბერი", "ნოემბერი", "დეკემბერი"
        ];

        return {
          period: `${monthNames[month - 1]} ${year}`,
          revenues: revenues._sum.amount || 0,
          expenses: expenses._sum.amount || 0,
          netIncome: (revenues._sum.amount || 0) - (expenses._sum.amount || 0),
        };
      } else {
        const year = parseInt(period);
        // Create dates in UTC to avoid timezone issues
        const startOfYear = new Date(Date.UTC(year, 0, 1));
        const endOfYear = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

        const [revenues, expenses] = await Promise.all([
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
        ]);

        return {
          period: year.toString(),
          revenues: revenues._sum.amount || 0,
          expenses: expenses._sum.amount || 0,
          netIncome: (revenues._sum.amount || 0) - (expenses._sum.amount || 0),
        };
      }
    };

    const [data1, data2] = await Promise.all([
      getPeriodData(period1),
      getPeriodData(period2),
    ]);

    statistics.push(data1, data2);

    return NextResponse.json(statistics);
  } catch (error) {
    console.error("Statistics compare error:", error);
    return NextResponse.json(
      { error: "შედარებისას მოხდა შეცდომა" },
      { status: 500 }
    );
  }
}


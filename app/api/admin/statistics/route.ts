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
    const view = searchParams.get("view");
    const year = searchParams.get("year");

    const statistics: Array<{
      period: string;
      revenues: number;
      expenses: number;
      netIncome: number;
    }> = [];

    if (view === "monthly" && year) {
      // Get statistics for each month of the year
      for (let month = 1; month <= 12; month++) {
        // Create dates in UTC to avoid timezone issues
        const startOfMonth = new Date(Date.UTC(parseInt(year), month - 1, 1));
        const endOfMonth = new Date(Date.UTC(parseInt(year), month, 0, 23, 59, 59, 999));

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

        statistics.push({
          period: `${monthNames[month - 1]} ${year}`,
          revenues: revenues._sum.amount || 0,
          expenses: expenses._sum.amount || 0,
          netIncome: (revenues._sum.amount || 0) - (expenses._sum.amount || 0),
        });
      }
    } else if (view === "yearly") {
      // Get statistics for last 5 years
      const currentYear = new Date().getFullYear();
      for (let y = currentYear - 4; y <= currentYear; y++) {
        // Create dates in UTC to avoid timezone issues
        const startOfYear = new Date(Date.UTC(y, 0, 1));
        const endOfYear = new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999));

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

        statistics.push({
          period: y.toString(),
          revenues: revenues._sum.amount || 0,
          expenses: expenses._sum.amount || 0,
          netIncome: (revenues._sum.amount || 0) - (expenses._sum.amount || 0),
        });
      }
    }

    return NextResponse.json(statistics);
  } catch (error) {
    console.error("Statistics fetch error:", error);
    return NextResponse.json(
      { error: "სტატისტიკის ჩატვირთვისას მოხდა შეცდომა" },
      { status: 500 }
    );
  }
}


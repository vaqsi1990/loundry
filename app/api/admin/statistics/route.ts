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
        // Create dates - use local timezone to match how dates are stored
        const startOfMonth = new Date(parseInt(year), month - 1, 1);
        startOfMonth.setHours(0, 0, 0, 0);
        const endOfMonth = new Date(parseInt(year), month, 0);
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
          Promise.all([
            prisma.adminInvoice.findMany({
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
            prisma.legalInvoice.findMany({
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
            prisma.physicalInvoice.findMany({
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
          ]).then(([admin, legal, physical]) => [...admin, ...legal, ...physical]),
        ]);

        const monthNames = [
          "იანვარი", "თებერვალი", "მარტი", "აპრილი", "მაისი", "ივნისი",
          "ივლისი", "აგვისტო", "სექტემბერი", "ოქტომბერი", "ნოემბერი", "დეკემბერი"
        ];

        const monthRevenues = (revenues._sum.amount || 0) + 
          (invoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0));
        const monthExpenses = expenses._sum.amount || 0;
        
        // Only add period if there is actual data
        if (monthRevenues > 0 || monthExpenses > 0) {
          statistics.push({
            period: `${monthNames[month - 1]} ${year}`,
            revenues: monthRevenues,
            expenses: monthExpenses,
            netIncome: monthRevenues - monthExpenses,
          });
        }
      }
    } else if (view === "yearly") {
      // Get statistics for last 5 years
      const currentYear = new Date().getFullYear();
      for (let y = currentYear - 4; y <= currentYear; y++) {
        // Create dates - use local timezone to match how dates are stored
        const startOfYear = new Date(y, 0, 1);
        startOfYear.setHours(0, 0, 0, 0);
        const endOfYear = new Date(y, 11, 31);
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
          Promise.all([
            prisma.adminInvoice.findMany({
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
            prisma.legalInvoice.findMany({
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
            prisma.physicalInvoice.findMany({
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
          ]).then(([admin, legal, physical]) => [...admin, ...legal, ...physical]),
        ]);

        const yearRevenues = (revenues._sum.amount || 0) + 
          (invoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0));
        const yearExpenses = expenses._sum.amount || 0;
        
        // Only add period if there is actual data
        if (yearRevenues > 0 || yearExpenses > 0) {
          statistics.push({
            period: y.toString(),
            revenues: yearRevenues,
            expenses: yearExpenses,
            netIncome: yearRevenues - yearExpenses,
          });
        }
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


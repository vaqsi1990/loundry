import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "არ არის ავტორიზებული" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (
      !user ||
      !["ADMIN", "MANAGER", "MANAGER_ASSISTANT"].includes(user.role)
    ) {
      return NextResponse.json({ error: "დაუშვებელია" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    const parsedMonth = month ? parseInt(month, 10) : NaN;
    const parsedYear = year ? parseInt(year, 10) : NaN;

    if (
      !Number.isFinite(parsedMonth) ||
      !Number.isFinite(parsedYear) ||
      parsedMonth < 1 ||
      parsedMonth > 12
    ) {
      return NextResponse.json(
        { error: "month/year არასწორია" },
        { status: 400 }
      );
    }

    // ✅ Start year for cumulative debt.
    // Change this if your business data starts earlier/later.
    const startYear = 2025;

    // ✅ UTC date boundaries
    const startDate = new Date(Date.UTC(startYear, 0, 1));
    const endDate = new Date(Date.UTC(parsedYear, parsedMonth, 0, 23, 59, 59, 999));

    // -------------------- TIME ENTRIES --------------------
    const timeRows = await prisma.employeeTimeEntry.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        employeeId: true,
        date: true,
        dailySalary: true,
      },
    });

    // accruedByEmployeeMonth[employeeId][year][month] = number
    const accruedByEmployeeMonth: Record<
      string,
      Record<number, Record<number, number>>
    > = {};

    for (const row of timeRows) {
      const employeeId = String(row.employeeId);
      const y = (row.date as Date).getUTCFullYear();
      const m = (row.date as Date).getUTCMonth() + 1;

      accruedByEmployeeMonth[employeeId] ??= {};
      accruedByEmployeeMonth[employeeId][y] ??= {};
      accruedByEmployeeMonth[employeeId][y][m] =
        (accruedByEmployeeMonth[employeeId][y][m] ?? 0) +
        (row.dailySalary ?? 0);
    }

    // -------------------- SALARIES --------------------
    const salaryRows = await prisma.salary.findMany({
      where: {
        employeeId: { not: null },
        status: { notIn: ["DELETED", "CANCELLED"] },
        year: { gte: startYear, lte: parsedYear },
        OR: [
          // All months for years before the selected year
          { year: { lt: parsedYear } },
          // Only up to selected month for the selected year
          { AND: [{ year: parsedYear }, { month: { lte: parsedMonth } }] },
        ],
      },
      select: {
        id: true,
        employeeId: true,
        year: true,
        month: true,
        issuedAmount: true,
        createdAt: true,
      },
    });

    // ✅ Deduplicate (latest createdAt)
    const bestSalaryRowByKey = new Map<string, typeof salaryRows[number]>();

    for (const row of salaryRows) {
      const employeeId = String(row.employeeId);
      const key = `${employeeId}-${row.year}-${row.month}`;

      const existing = bestSalaryRowByKey.get(key);

      if (!existing) {
        bestSalaryRowByKey.set(key, row);
        continue;
      }

      const existingTime = new Date(existing.createdAt).getTime();
      const currentTime = new Date(row.createdAt).getTime();

      if (currentTime > existingTime) {
        bestSalaryRowByKey.set(key, row);
      }
    }

    // issuedByEmployeeMonth[employeeId][year][month] = number
    const issuedByEmployeeMonth: Record<
      string,
      Record<number, Record<number, number>>
    > = {};

    for (const row of bestSalaryRowByKey.values()) {
      const employeeId = String(row.employeeId);
      const y = row.year;
      const m = row.month;

      issuedByEmployeeMonth[employeeId] ??= {};
      issuedByEmployeeMonth[employeeId][y] ??= {};
      issuedByEmployeeMonth[employeeId][y][m] =
        (issuedByEmployeeMonth[employeeId][y][m] ?? 0) +
        (row.issuedAmount ?? 0);
    }

    // -------------------- DEBT CALCULATION --------------------
    const employeeIds = new Set<string>([
      ...Object.keys(accruedByEmployeeMonth),
      ...Object.keys(issuedByEmployeeMonth),
    ]);

    const debtByEmployeeId: Record<string, number> = {};

    for (const employeeId of employeeIds) {
      let balance = 0;

      for (let y = startYear; y <= parsedYear; y++) {
        const lastMonth = y === parsedYear ? parsedMonth : 12;
        for (let m = 1; m <= lastMonth; m++) {
          const accrued = accruedByEmployeeMonth[employeeId]?.[y]?.[m] ?? 0;
          const issued = issuedByEmployeeMonth[employeeId]?.[y]?.[m] ?? 0;

          const monthlyDelta = accrued - issued;

          // ✅ Carryover but never negative
          balance = Math.max(0, balance + monthlyDelta);
        }
      }

      debtByEmployeeId[employeeId] = balance;
    }

    return NextResponse.json(debtByEmployeeId);
  } catch (error) {
    console.error("Salaries debt fetch error:", error);

    return NextResponse.json(
      { error: "დავალიანების ჩატვირთვისას მოხდა შეცდომა" },
      { status: 500 }
    );
  }
}
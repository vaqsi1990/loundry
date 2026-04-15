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

    // accruedByEmployeeMonth[key][year][month] = number
    // key format:
    // - "id:<employeeId>" when employeeId exists
    const accruedByEmployeeMonth: Record<
      string,
      Record<number, Record<number, number>>
    > = {};

    for (const row of timeRows) {
      // If employee was deleted and FK nulled out, we can't attribute
      // time entries to a stable employee key. Skip those rows here.
      if (!row.employeeId) continue;
      const key = `id:${String(row.employeeId)}`;
      const y = (row.date as Date).getUTCFullYear();
      const m = (row.date as Date).getUTCMonth() + 1;

      accruedByEmployeeMonth[key] ??= {};
      accruedByEmployeeMonth[key][y] ??= {};
      accruedByEmployeeMonth[key][y][m] =
        (accruedByEmployeeMonth[key][y][m] ?? 0) +
        (row.dailySalary ?? 0);
    }

    // -------------------- SALARIES --------------------
    const salaryRows = await prisma.salary.findMany({
      where: {
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
        employeeName: true,
        year: true,
        month: true,
        issuedAmount: true,
        accruedAmount: true,
        amount: true,
        createdAt: true,
      },
    });

    // ✅ Deduplicate (latest createdAt)
    const bestSalaryRowByKey = new Map<string, typeof salaryRows[number]>();

    for (const row of salaryRows) {
      const employeeKey = row.employeeId
        ? `id:${String(row.employeeId)}`
        : `name:${String(row.employeeName || "").toLowerCase().trim()}`;
      const key = `${employeeKey}-${row.year}-${row.month}`;

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
      const employeeKey = row.employeeId
        ? `id:${String(row.employeeId)}`
        : `name:${String(row.employeeName || "").toLowerCase().trim()}`;
      const y = row.year;
      const m = row.month;

      issuedByEmployeeMonth[employeeKey] ??= {};
      issuedByEmployeeMonth[employeeKey][y] ??= {};
      issuedByEmployeeMonth[employeeKey][y][m] =
        (issuedByEmployeeMonth[employeeKey][y][m] ?? 0) +
        (row.issuedAmount ?? 0);
    }

    // If time entries are missing (e.g. employee deleted -> time entries cascaded),
    // fall back to the stored salary accruedAmount/amount so debt doesn't "reset".
    // We only fill gaps to avoid double-counting where time-entry data exists.
    for (const row of bestSalaryRowByKey.values()) {
      const employeeKey = row.employeeId
        ? `id:${String(row.employeeId)}`
        : `name:${String(row.employeeName || "").toLowerCase().trim()}`;
      const y = row.year;
      const m = row.month;
      const accrued = (row.accruedAmount ?? row.amount ?? 0) as number;

      accruedByEmployeeMonth[employeeKey] ??= {};
      accruedByEmployeeMonth[employeeKey][y] ??= {};

      const monthMap = accruedByEmployeeMonth[employeeKey][y];
      // Only set if this month wasn't computed from time entries.
      if (!(m in monthMap)) {
        monthMap[m] = accrued;
      }
    }

    // -------------------- DEBT CALCULATION --------------------
    const employeeKeys = new Set<string>([
      ...Object.keys(accruedByEmployeeMonth),
      ...Object.keys(issuedByEmployeeMonth),
    ]);

    const debtByEmployeeKey: Record<string, number> = {};

    for (const employeeKey of employeeKeys) {
      let balance = 0;

      for (let y = startYear; y <= parsedYear; y++) {
        const lastMonth = y === parsedYear ? parsedMonth : 12;
        for (let m = 1; m <= lastMonth; m++) {
          const accrued = accruedByEmployeeMonth[employeeKey]?.[y]?.[m] ?? 0;
          const issued = issuedByEmployeeMonth[employeeKey]?.[y]?.[m] ?? 0;

          const monthlyDelta = accrued - issued;

          // ✅ Carryover but never negative
          balance = Math.max(0, balance + monthlyDelta);
        }
      }

      debtByEmployeeKey[employeeKey] = balance;
    }

    return NextResponse.json(debtByEmployeeKey);
  } catch (error) {
    console.error("Salaries debt fetch error:", error);

    return NextResponse.json(
      { error: "დავალიანების ჩატვირთვისას მოხდა შეცდომა" },
      { status: 500 }
    );
  }
}
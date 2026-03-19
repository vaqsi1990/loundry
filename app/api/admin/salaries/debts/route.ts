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

    if (!user || (user.role !== "ADMIN" && user.role !== "MANAGER" && user.role !== "MANAGER_ASSISTANT")) {
      return NextResponse.json({ error: "დაუშვებელია" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    if (!month || !year) {
      return NextResponse.json({ error: "month/year required" }, { status: 400 });
    }

    const currentMonth = parseInt(month, 10);
    const currentYear = parseInt(year, 10);

    // Sum "remainingAmount" for all previous months (per employee).
    // We treat only positive remaining as debt.
    const priorSalaries = await prisma.salary.findMany({
      where: {
        status: { not: "CANCELLED" },
        OR: [
          { year: { lt: currentYear } },
          { year: currentYear, month: { lt: currentMonth } },
        ],
      },
      select: {
        employeeId: true,
        employeeName: true,
        remainingAmount: true,
      },
    });

    const debtByKey: Record<string, number> = {};

    for (const s of priorSalaries) {
      const key =
        s.employeeId ||
        (s.employeeName ? s.employeeName.toLowerCase().trim() : "") ||
        "";

      if (!key) continue;

      // Include the full remainingAmount (can be positive/negative) so that
      // the "previous months sum" matches what users see per month.
      const remaining = s.remainingAmount ?? 0;
      debtByKey[key] = (debtByKey[key] ?? 0) + remaining;
    }

    return NextResponse.json(debtByKey);
  } catch (error) {
    console.error("Salaries debts fetch error:", error);
    return NextResponse.json(
      { error: "დავალიანების ჩატვირთვისას მოხდა შეცდომა" },
      { status: 500 }
    );
  }
}


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
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    let where: any = {};

    if (month && year) {
      where.month = parseInt(month);
      where.year = parseInt(year);
    }

    const salaries = await prisma.salary.findMany({
      where,
      orderBy: [
        { year: "desc" },
        { month: "desc" },
      ],
    });

    return NextResponse.json(salaries);
  } catch (error) {
    console.error("Salaries fetch error:", error);
    return NextResponse.json(
      { error: "ხელფასების ჩატვირთვისას მოხდა შეცდომა" },
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
    const { 
      employeeId,
      employeeName, 
      firstName, 
      lastName, 
      personalId,
      accruedAmount, 
      issuedAmount, 
      remainingAmount,
      amount, 
      month, 
      year, 
      status, 
      notes 
    } = body;

    // Check if salary already exists for this employee and month/year
    const existingSalary = await prisma.salary.findFirst({
      where: {
        month: parseInt(month),
        year: parseInt(year),
        OR: [
          employeeId ? { employeeId } : { employeeName: employeeName },
        ],
      },
    });

    if (existingSalary) {
      // Update existing salary instead of creating duplicate
      const updatedSalary = await prisma.salary.update({
        where: { id: existingSalary.id },
        data: {
          accruedAmount: (existingSalary.accruedAmount || 0) + (accruedAmount ? parseFloat(accruedAmount) : 0),
          amount: (existingSalary.amount || 0) + (amount ? parseFloat(amount) : 0),
          remainingAmount: ((existingSalary.accruedAmount || 0) + (accruedAmount ? parseFloat(accruedAmount) : 0)) - (existingSalary.issuedAmount || 0),
        },
      });
      return NextResponse.json(updatedSalary, { status: 200 });
    }

    const salary = await prisma.salary.create({
      data: {
        employeeId: employeeId || null,
        employeeName,
        firstName: firstName || null,
        lastName: lastName || null,
        personalId: personalId || null,
        accruedAmount: accruedAmount ? parseFloat(accruedAmount) : null,
        issuedAmount: issuedAmount ? parseFloat(issuedAmount) : null,
        remainingAmount: remainingAmount !== undefined && remainingAmount !== null ? parseFloat(remainingAmount) : null,
        amount,
        month: parseInt(month),
        year: parseInt(year),
        status,
        notes: notes || null,
      },
    });

    return NextResponse.json(salary, { status: 201 });
  } catch (error) {
    console.error("Salary create error:", error);
    return NextResponse.json(
      { error: "ხელფასის დამატებისას მოხდა შეცდომა" },
      { status: 500 }
    );
  }
}


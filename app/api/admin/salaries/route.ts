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
      employeeName, 
      firstName, 
      lastName, 
      workPeriodStart, 
      workPeriodEnd, 
      accruedAmount, 
      issuedAmount, 
      signature,
      amount, 
      month, 
      year, 
      status, 
      notes 
    } = body;

    const salary = await prisma.salary.create({
      data: {
        employeeName,
        firstName: firstName || null,
        lastName: lastName || null,
        workPeriodStart: workPeriodStart ? new Date(workPeriodStart) : null,
        workPeriodEnd: workPeriodEnd ? new Date(workPeriodEnd) : null,
        accruedAmount: accruedAmount ? parseFloat(accruedAmount) : null,
        issuedAmount: issuedAmount ? parseFloat(issuedAmount) : null,
        signature: signature || null,
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


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
    const date = searchParams.get("date");
    const month = searchParams.get("month"); // Format: YYYY-MM

    let whereClause: any = {};
    if (date) {
      whereClause.date = new Date(date);
    } else if (month) {
      // Filter by month: get first and last day of the month
      const [year, monthNum] = month.split("-").map(Number);
      const firstDay = new Date(year, monthNum - 1, 1);
      const lastDay = new Date(year, monthNum, 0, 23, 59, 59, 999);
      whereClause.date = {
        gte: firstDay,
        lte: lastDay,
      };
    }

    const timeEntries = await prisma.employeeTimeEntry.findMany({
      where: whereClause,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            phone: true,
            position: true,
          },
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    return NextResponse.json(timeEntries);
  } catch (error) {
    console.error("Time entries fetch error:", error);
    return NextResponse.json(
      { error: "დროის ჩანაწერების ჩატვირთვისას მოხდა შეცდომა" },
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
    const { employeeId, date, arrivalTime, departureTime, dailySalary } = body;

    if (!employeeId || !date) {
      return NextResponse.json(
        { error: "თანამშრომელი და თარიღი აუცილებელია" },
        { status: 400 }
      );
    }

    // Check if entry already exists for this employee and date
    const existingEntry = await prisma.employeeTimeEntry.findUnique({
      where: {
        employeeId_date: {
          employeeId,
          date: new Date(date),
        },
      },
    });

    let timeEntry;
    if (existingEntry) {
      // Update existing entry
      timeEntry = await prisma.employeeTimeEntry.update({
        where: { id: existingEntry.id },
        data: {
          arrivalTime: arrivalTime || null,
          departureTime: departureTime || null,
          dailySalary: dailySalary ? parseFloat(dailySalary) : null,
        },
        include: {
          employee: {
            select: {
              id: true,
              name: true,
              phone: true,
              position: true,
            },
          },
        },
      });
    } else {
      // Create new entry
      timeEntry = await prisma.employeeTimeEntry.create({
        data: {
          employeeId,
          date: new Date(date),
          arrivalTime: arrivalTime || null,
          departureTime: departureTime || null,
          dailySalary: dailySalary ? parseFloat(dailySalary) : null,
        },
        include: {
          employee: {
            select: {
              id: true,
              name: true,
              phone: true,
              position: true,
            },
          },
        },
      });
    }

    return NextResponse.json(timeEntry, { status: existingEntry ? 200 : 201 });
  } catch (error) {
    console.error("Time entry create/update error:", error);
    return NextResponse.json(
      { error: "დროის ჩანაწერის შენახვისას მოხდა შეცდომა" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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
    const employeeId = searchParams.get("employeeId");
    const date = searchParams.get("date");

    if (!employeeId || !date) {
      return NextResponse.json(
        { error: "თანამშრომელი და თარიღი აუცილებელია" },
        { status: 400 }
      );
    }

    // Find and delete the time entry
    const deletedEntry = await prisma.employeeTimeEntry.delete({
      where: {
        employeeId_date: {
          employeeId,
          date: new Date(date),
        },
      },
    });

    return NextResponse.json(
      { message: "დროის ჩანაწერი წარმატებით წაიშალა", deletedEntry },
      { status: 200 }
    );
  } catch (error) {
    console.error("Time entry delete error:", error);
    // If entry doesn't exist, that's okay - return success
    if ((error as any).code === "P2025") {
      return NextResponse.json(
        { message: "დროის ჩანაწერი არ მოიძებნა" },
        { status: 200 }
      );
    }
    return NextResponse.json(
      { error: "დროის ჩანაწერის წაშლისას მოხდა შეცდომა" },
      { status: 500 }
    );
  }
}


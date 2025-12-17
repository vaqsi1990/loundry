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

    const configurations = await prisma.employeeTableConfiguration.findMany({
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
        order: "asc",
      },
    });

    return NextResponse.json(configurations);
  } catch (error) {
    console.error("Table configuration fetch error:", error);
    return NextResponse.json(
      { error: "ტაბელის კონფიგურაციის ჩატვირთვისას მოხდა შეცდომა" },
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
    const { employeeIds } = body; // Array of employee IDs with their order

    if (!Array.isArray(employeeIds)) {
      return NextResponse.json(
        { error: "თანამშრომლების სია აუცილებელია" },
        { status: 400 }
      );
    }

    // Delete all existing configurations
    await prisma.employeeTableConfiguration.deleteMany({});

    // Create new configurations
    const configurations = await Promise.all(
      employeeIds.map((employeeId: string, index: number) =>
        prisma.employeeTableConfiguration.create({
          data: {
            employeeId,
            order: index,
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
        })
      )
    );

    return NextResponse.json(configurations, { status: 201 });
  } catch (error) {
    console.error("Table configuration save error:", error);
    return NextResponse.json(
      { error: "ტაბელის კონფიგურაციის შენახვისას მოხდა შეცდომა" },
      { status: 500 }
    );
  }
}


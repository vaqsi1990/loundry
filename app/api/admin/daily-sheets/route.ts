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

    const sheets = await prisma.dailySheet.findMany({
      orderBy: {
        date: "desc",
      },
    });

    return NextResponse.json(sheets);
  } catch (error) {
    console.error("Daily sheets fetch error:", error);
    return NextResponse.json(
      { error: "დღის ფურცლების ჩატვირთვისას მოხდა შეცდომა" },
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
    const { date, description, notes } = body;

    // Check if sheet for this date already exists
    const existing = await prisma.dailySheet.findUnique({
      where: { date: new Date(date) },
    });

    if (existing) {
      return NextResponse.json(
        { error: "ამ თარიღის ფურცელი უკვე არსებობს" },
        { status: 400 }
      );
    }

    const sheet = await prisma.dailySheet.create({
      data: {
        date: new Date(date),
        description: description || null,
        notes: notes || null,
      },
    });

    return NextResponse.json(sheet, { status: 201 });
  } catch (error) {
    console.error("Daily sheet create error:", error);
    return NextResponse.json(
      { error: "დღის ფურცლის დამატებისას მოხდა შეცდომა" },
      { status: 500 }
    );
  }
}


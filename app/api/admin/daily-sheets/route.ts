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
      include: {
        items: {
          orderBy: {
            category: "asc",
          },
        },
      },
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
    const { date, hotelName, roomNumber, description, notes, items } = body;

    if (!hotelName) {
      return NextResponse.json(
        { error: "სასტუმროს სახელი აუცილებელია" },
        { status: 400 }
      );
    }

    const sheet = await prisma.dailySheet.create({
      data: {
        date: new Date(date),
        hotelName: hotelName,
        roomNumber: roomNumber || null,
        description: description || null,
        notes: notes || null,
        items: {
          create: items?.map((item: any) => ({
            category: item.category,
            itemNameEn: item.itemNameEn,
            itemNameKa: item.itemNameKa,
            weight: item.weight,
            received: item.received || 0,
            washCount: item.washCount || 0,
            dispatched: item.dispatched || 0,
            shortage: item.shortage || 0,
            totalWeight: item.totalWeight || 0,
            comment: item.comment || null,
          })) || [],
        },
      },
      include: {
        items: true,
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


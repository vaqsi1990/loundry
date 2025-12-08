import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const body = await request.json();
    const { date, hotelName, roomNumber, description, notes, sheetType, totalWeight, items } = body;

    if (!hotelName) {
      return NextResponse.json(
        { error: "სასტუმროს სახელი აუცილებელია" },
        { status: 400 }
      );
    }

    // Delete existing items and create new ones
    await prisma.dailySheetItem.deleteMany({
      where: { dailySheetId: id },
    });

    // Format date properly to avoid timezone issues
    let dateObj: Date;
    if (typeof date === 'string') {
      const dateStr = date.split('T')[0];
      const dateParts = dateStr.split('-');
      if (dateParts.length === 3) {
        const year = parseInt(dateParts[0], 10);
        const month = parseInt(dateParts[1], 10) - 1;
        const day = parseInt(dateParts[2], 10);
        dateObj = new Date(Date.UTC(year, month, day, 12, 0, 0, 0));
      } else {
        const parsed = new Date(date);
        const year = parsed.getUTCFullYear();
        const month = parsed.getUTCMonth();
        const day = parsed.getUTCDate();
        dateObj = new Date(Date.UTC(year, month, day, 12, 0, 0, 0));
      }
    } else {
      const parsed = new Date(date);
      const year = parsed.getUTCFullYear();
      const month = parsed.getUTCMonth();
      const day = parsed.getUTCDate();
      dateObj = new Date(Date.UTC(year, month, day, 12, 0, 0, 0));
    }

    // Get pricePerKg from hotel
    let pricePerKg: number | null = null;
    if (hotelName) {
      const hotel = await prisma.hotel.findFirst({
        where: { hotelName: hotelName },
        select: { pricePerKg: true },
      });
      pricePerKg = hotel?.pricePerKg ?? null;
    }

    const sheet = await prisma.dailySheet.update({
      where: { id },
      data: {
        date: dateObj,
        hotelName: hotelName,
        roomNumber: roomNumber || null,
        description: description || null,
        notes: notes || null,
        pricePerKg: pricePerKg,
        sheetType: sheetType || "INDIVIDUAL",
        totalWeight: totalWeight ? parseFloat(totalWeight) : null,
        items: {
          create: items?.map((item: any) => ({
            category: item.category,
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

    return NextResponse.json(sheet);
  } catch (error) {
    console.error("Daily sheet update error:", error);
    return NextResponse.json(
      { error: "დღის ფურცლის განახლებისას მოხდა შეცდომა" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    await prisma.dailySheet.delete({
      where: { id },
    });

    return NextResponse.json({ message: "დღის ფურცელი წაიშალა" });
  } catch (error) {
    console.error("Daily sheet delete error:", error);
    return NextResponse.json(
      { error: "დღის ფურცლის წაშლისას მოხდა შეცდომა" },
      { status: 500 }
    );
  }
}


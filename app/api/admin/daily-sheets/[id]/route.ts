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
    const { date, hotelName, roomNumber, description, notes, items } = body;

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

    const sheet = await prisma.dailySheet.update({
      where: { id },
      data: {
        date: new Date(date),
        hotelName: hotelName,
        roomNumber: roomNumber || null,
        description: description || null,
        notes: notes || null,
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


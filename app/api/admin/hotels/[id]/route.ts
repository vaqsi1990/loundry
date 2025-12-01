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
    const { hotelName, contactPhone, email, address, notes } = body;

    const hotel = await prisma.hotelDatabase.update({
      where: { id },
      data: {
        hotelName,
        contactPhone,
        email: email || null,
        address: address || null,
        notes: notes || null,
      },
    });

    return NextResponse.json(hotel);
  } catch (error) {
    console.error("Hotel update error:", error);
    return NextResponse.json(
      { error: "სასტუმროს განახლებისას მოხდა შეცდომა" },
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

    await prisma.hotelDatabase.delete({
      where: { id },
    });

    return NextResponse.json({ message: "სასტუმრო წაიშალა" });
  } catch (error) {
    console.error("Hotel delete error:", error);
    return NextResponse.json(
      { error: "სასტუმროს წაშლისას მოხდა შეცდომა" },
      { status: 500 }
    );
  }
}


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

    const hotels = await prisma.hotelDatabase.findMany({
      orderBy: {
        hotelName: "asc",
      },
    });

    return NextResponse.json(hotels);
  } catch (error) {
    console.error("Hotels fetch error:", error);
    return NextResponse.json(
      { error: "სასტუმროების ჩატვირთვისას მოხდა შეცდომა" },
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
    const { hotelName, contactPhone, email, address, notes } = body;

    const hotel = await prisma.hotelDatabase.create({
      data: {
        hotelName,
        contactPhone,
        email: email || null,
        address: address || null,
        notes: notes || null,
      },
    });

    return NextResponse.json(hotel, { status: 201 });
  } catch (error) {
    console.error("Hotel create error:", error);
    return NextResponse.json(
      { error: "სასტუმროს დამატებისას მოხდა შეცდომა" },
      { status: 500 }
    );
  }
}


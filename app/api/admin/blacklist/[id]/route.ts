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
    const { hotelName, hotelRegistrationNumber, contactPhone, email, address, reason, notes } = body;

    const item = await prisma.blacklist.update({
      where: { id },
      data: {
        hotelName,
        hotelRegistrationNumber: hotelRegistrationNumber || null,
        contactPhone,
        email: email || null,
        address: address || null,
        reason: reason || null,
        notes: notes || null,
      },
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error("Blacklist update error:", error);
    return NextResponse.json(
      { error: "ჩანაწერის განახლებისას მოხდა შეცდომა" },
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

    await prisma.blacklist.delete({
      where: { id },
    });

    return NextResponse.json({ message: "ჩანაწერი წაიშალა" });
  } catch (error) {
    console.error("Blacklist delete error:", error);
    return NextResponse.json(
      { error: "ჩანაწერის წაშლისას მოხდა შეცდომა" },
      { status: 500 }
    );
  }
}


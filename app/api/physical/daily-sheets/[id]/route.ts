import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// Delete daily sheet for physical person
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

    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        hotels: {
          where: { type: "PHYSICAL" },
        },
      },
    });

    if (!user || !user.hotels || user.hotels.length === 0) {
      return NextResponse.json(
        { error: "ფიზიკური პირის სასტუმრო არ მოიძებნა" },
        { status: 404 }
      );
    }

    const hotel = user.hotels[0];

    // Check if sheet belongs to this hotel
    const sheet = await prisma.dailySheet.findUnique({
      where: { id },
    });

    if (!sheet || sheet.hotelName !== hotel.hotelName) {
      return NextResponse.json(
        { error: "დღის ფურცელი ვერ მოიძებნა" },
        { status: 404 }
      );
    }

    // Delete the sheet (items will be deleted automatically due to cascade)
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

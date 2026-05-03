import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  serializeDailySheetForClient,
  sheetNotesFromBody,
} from "@/lib/daily-sheet-api";

const normalizeHotel = (name: string | null) => {
  if (!name) return "";
  return name.trim().replace(/\s+/g, " ").toLowerCase();
};

// Hotel user: update emailed daily sheet line items / notes (immutable date/hotel locked on server).
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
    const normalizedHotelName = normalizeHotel(hotel.hotelName);
    const { id } = await params;

    const existing = await prisma.physicalDailySheet.findUnique({
      where: { id },
    });

    if (
      !existing ||
      normalizeHotel(existing.hotelName) !== normalizedHotelName
    ) {
      return NextResponse.json(
        { error: "დღის ფურცელი ვერ მოიძებნა" },
        { status: 404 }
      );
    }

    if (!existing.emailedAt) {
      return NextResponse.json(
        {
          error:
            "ეს დღის ფურცელი ჯერ გაგზავნილი არ არის და პორტალიდან რედაქტირება ვერ შესრულდება.",
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      roomNumber,
      description,
      notes,
      comment,
      sheetType,
      totalWeight,
      pricePerKg,
      totalPrice,
      items,
      shiftType,
    } = body;

    if (!Array.isArray(items)) {
      return NextResponse.json(
        { error: "სავალდებულოა პოზიციების სია" },
        { status: 400 }
      );
    }

    await prisma.physicalDailySheetItem.deleteMany({
      where: { dailySheetId: id },
    });

    let finalPricePerKg: number | null =
      typeof existing.pricePerKg === "number" ? existing.pricePerKg : null;
    if (pricePerKg !== undefined && pricePerKg !== null) {
      finalPricePerKg =
        typeof pricePerKg === "number"
          ? pricePerKg
          : parseFloat(String(pricePerKg));
    } else if (existing.hotelName) {
      const normalizedSheetHotel = normalizeHotel(existing.hotelName);
      let dbHotel = await prisma.hotel.findFirst({
        where: { hotelName: existing.hotelName },
        select: { pricePerKg: true },
      });
      if (!dbHotel) {
        const allHotels = await prisma.hotel.findMany({
          select: { hotelName: true, pricePerKg: true },
        });
        dbHotel =
          allHotels
            .filter((h) => h.hotelName != null)
            .find((h) => normalizeHotel(h.hotelName) === normalizedSheetHotel) ||
          null;
      }
      finalPricePerKg = dbHotel?.pricePerKg ?? finalPricePerKg;
    }

    const updateData = {
      date: existing.date,
      hotelName: existing.hotelName,
      roomNumber:
        roomNumber !== undefined ? roomNumber || null : existing.roomNumber,
      description:
        description !== undefined
          ? description || null
          : existing.description,
      notes:
        notes !== undefined || comment !== undefined
          ? sheetNotesFromBody(comment, notes)
          : existing.notes,
      shiftType:
        shiftType && typeof shiftType === "string"
          ? shiftType
          : existing.shiftType,
      pricePerKg: finalPricePerKg,
      sheetType: sheetType || existing.sheetType,
      totalWeight:
        totalWeight !== undefined && totalWeight !== null
          ? parseFloat(String(totalWeight))
          : existing.totalWeight,
      totalPrice:
        totalPrice !== undefined && totalPrice !== null
          ? parseFloat(String(totalPrice))
          : existing.totalPrice,
      items: {
        create: items.map((item: any) => ({
          category: item.category,
          itemNameKa: item.itemNameKa,
          weight:
            typeof item.weight === "number"
              ? item.weight
              : Number(String(item.weight ?? "").replace(",", ".")) || 0,
          received:
            typeof item.received === "number"
              ? item.received
              : Number(String(item.received ?? "").replace(",", ".")) || 0,
          washCount:
            typeof item.washCount === "number"
              ? item.washCount
              : Number(String(item.washCount ?? "").replace(",", ".")) || 0,
          dispatched:
            typeof item.dispatched === "number"
              ? item.dispatched
              : Number(String(item.dispatched ?? "").replace(",", ".")) || 0,
          shortage:
            typeof item.shortage === "number"
              ? item.shortage
              : Number(String(item.shortage ?? "").replace(",", ".")) || 0,
          totalWeight:
            typeof item.totalWeight === "number"
              ? item.totalWeight
              : Number(String(item.totalWeight ?? "").replace(",", ".")) || 0,
          price:
            item.price !== undefined && item.price !== null
              ? typeof item.price === "number"
                ? item.price
                : Number(item.price) || null
              : null,
          comment:
            typeof item.comment === "string" ? item.comment || null : null,
        })),
      },
    };

    const sheet = await prisma.physicalDailySheet.update({
      where: { id },
      data: updateData,
      include: { items: true },
    });

    return NextResponse.json(serializeDailySheetForClient(sheet as Record<string, unknown>));
  } catch (error) {
    console.error("Physical daily sheet hotel update error:", error);
    return NextResponse.json(
      { error: "დღის ფურცლის განახლებისას მოხდა შეცდომა" },
      { status: 500 }
    );
  }
}

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
    const sheet = await prisma.physicalDailySheet.findUnique({
      where: { id },
    });

    if (!sheet || sheet.hotelName !== hotel.hotelName) {
      return NextResponse.json(
        { error: "დღის ფურცელი ვერ მოიძებნა" },
        { status: 404 }
      );
    }

    // Delete the sheet (items will be deleted automatically due to cascade)
    await prisma.physicalDailySheet.delete({
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

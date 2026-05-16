import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  serializeDailySheetForClient,
  sheetNotesFromBody,
} from "@/lib/daily-sheet-api";
import { syncEmailSendTotalsAfterSheetSaveLegal } from "@/lib/sync-daily-sheet-email-send-totals";
import {
  collectHotelDailySheetNameAliases,
  dailySheetBelongsToHotel,
  getHotelContactEmails,
} from "@/lib/hotel-daily-sheet-ownership";

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
          where: { type: "LEGAL" },
        },
      },
    });

    if (!user || !user.hotels || user.hotels.length === 0) {
      return NextResponse.json(
        { error: "იურიდიული პირის სასტუმრო არ მოიძებნა" },
        { status: 404 }
      );
    }

    const hotel = user.hotels[0];
    const contactEmails = getHotelContactEmails(hotel, user);
    const nameAliases = await collectHotelDailySheetNameAliases(
      "legal",
      hotel,
      user
    );
    const { id } = await params;

    const existing = await prisma.legalDailySheet.findUnique({
      where: { id },
    });

    if (
      !existing ||
      !dailySheetBelongsToHotel(existing, nameAliases, contactEmails)
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
      heavyWeight,
      heavyPricePerKg,
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

    await prisma.legalDailySheetItem.deleteMany({
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
      const dbHotel = await prisma.hotel.findFirst({
        where: { hotelName: existing.hotelName },
        select: { pricePerKg: true },
      });
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
      heavyWeight:
        heavyWeight !== undefined && heavyWeight !== null && String(heavyWeight).trim() !== ""
          ? parseFloat(String(heavyWeight))
          : (existing as any).heavyWeight ?? null,
      heavyPricePerKg:
        heavyPricePerKg !== undefined && heavyPricePerKg !== null && String(heavyPricePerKg).trim() !== ""
          ? parseFloat(String(heavyPricePerKg))
          : (existing as any).heavyPricePerKg ?? null,
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

    const sheet = await prisma.legalDailySheet.update({
      where: { id },
      data: updateData,
      include: { items: true },
    });

    try {
      await syncEmailSendTotalsAfterSheetSaveLegal(id);
    } catch (e) {
      console.error("Sync legal email-send totals after sheet update:", e);
    }

    return NextResponse.json(serializeDailySheetForClient(sheet as Record<string, unknown>));
  } catch (error) {
    console.error("Legal daily sheet hotel update error:", error);
    return NextResponse.json(
      { error: "დღის ფურცლის განახლებისას მოხდა შეცდომა" },
      { status: 500 }
    );
  }
}

// Delete daily sheet for legal person
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
          where: { type: "LEGAL" },
        },
      },
    });

    if (!user || !user.hotels || user.hotels.length === 0) {
      return NextResponse.json(
        { error: "იურიდიული პირის სასტუმრო არ მოიძებნა" },
        { status: 404 }
      );
    }

    const hotel = user.hotels[0];
    const contactEmails = getHotelContactEmails(hotel, user);
    const nameAliases = await collectHotelDailySheetNameAliases(
      "legal",
      hotel,
      user
    );

    const sheet = await prisma.legalDailySheet.findUnique({
      where: { id },
    });

    if (!sheet || !dailySheetBelongsToHotel(sheet, nameAliases, contactEmails)) {
      return NextResponse.json(
        { error: "დღის ფურცელი ვერ მოიძებნა" },
        { status: 404 }
      );
    }

    // Delete the sheet (items will be deleted automatically due to cascade)
    await prisma.legalDailySheet.delete({
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

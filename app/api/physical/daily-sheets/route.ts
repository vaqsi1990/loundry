import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// Get daily sheets for physical person hotel
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
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month"); // YYYY-MM format
    const day = searchParams.get("day"); // YYYY-MM-DD format

    const where: any = {
      hotelName: hotel.hotelName,
    };

    if (day) {
      // Filter by specific day
      const dayDate = new Date(day);
      const startOfDay = new Date(dayDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(dayDate.setHours(23, 59, 59, 999));
      where.date = {
        gte: startOfDay,
        lte: endOfDay,
      };
    } else if (month) {
      // Filter by month
      const [year, monthNum] = month.split("-");
      const startOfMonth = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
      const endOfMonth = new Date(parseInt(year), parseInt(monthNum), 0, 23, 59, 59, 999);
      where.date = {
        gte: startOfMonth,
        lte: endOfMonth,
      };
    }

    // Get daily sheets with their email sends to show confirmation status per email send
    const sheets = await prisma.dailySheet.findMany({
      where,
      include: {
        items: {
          orderBy: {
            category: "asc",
          },
        },
        emailSends: {
          orderBy: {
            sentAt: "desc",
          },
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    // Return sheets with their email sends (but confirmation status is separate)
    // Daily sheet confirmation uses DailySheet.confirmedAt
    // Invoice confirmation uses DailySheetEmailSend.confirmedAt (separate)
    const sheetsWithEmailSends = sheets.map((sheet) => ({
      ...sheet,
      emailSends: sheet.emailSends || [],
    }));

    return NextResponse.json(sheetsWithEmailSends);
  } catch (error) {
    console.error("Physical daily sheets fetch error:", error);
    return NextResponse.json(
      { error: "დღის ფურცლების ჩატვირთვისას მოხდა შეცდომა" },
      { status: 500 }
    );
  }
}

// Confirm daily sheet
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "არ არის ავტორიზებული" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const sheetId = searchParams.get("id");

    if (!sheetId) {
      return NextResponse.json(
        { error: "დღის ფურცლის ID აუცილებელია" },
        { status: 400 }
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

    // Check if sheet belongs to this hotel
    const sheet = await prisma.dailySheet.findUnique({
      where: { id: sheetId },
    });

    if (!sheet || sheet.hotelName !== hotel.hotelName) {
      return NextResponse.json(
        { error: "დღის ფურცელი ვერ მოიძებნა" },
        { status: 404 }
      );
    }

    // Check if daily sheet is already confirmed
    if (sheet.confirmedAt !== null && sheet.confirmedAt !== undefined) {
      return NextResponse.json(
        { error: "დღის ფურცელი უკვე დადასტურებულია" },
        { status: 400 }
      );
    }

    // Confirm only the daily sheet (NOT the email sends/invoices)
    // Daily sheet confirmation and invoice confirmation are separate
    const updated = await prisma.dailySheet.update({
      where: { id: sheetId },
      data: {
        confirmedBy: session.user.id,
        confirmedAt: new Date(),
      } as any,
    });

    return NextResponse.json({ 
      message: "დღის ფურცელი დაადასტურა", 
      sheet: updated
    });
  } catch (error) {
    console.error("Daily sheet confirmation error:", error);
    return NextResponse.json(
      { error: "დადასტურებისას მოხდა შეცდომა" },
      { status: 500 }
    );
  }
}


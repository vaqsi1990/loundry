import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// Normalize hotel name for case-insensitive matching
const normalizeHotel = (name: string | null) => {
  if (!name) return "";
  return name.trim().replace(/\s+/g, " ").toLowerCase();
};

// Confirm a single invoice (specific date, amount, weight, protectors)
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

    const body = await request.json();
    const { date, month, amount, weightKg, protectorsAmount, emailSendIds } = body;

    // If emailSendIds are provided, date/amount/weight/protectors are optional
    // Otherwise, they are required for backward compatibility
    if (!emailSendIds || !Array.isArray(emailSendIds) || emailSendIds.length === 0) {
      if (!date || amount === undefined || weightKg === undefined || protectorsAmount === undefined) {
        return NextResponse.json(
          { error: "თარიღი, ფასი, წონა და დამცავები აუცილებელია (ან emailSendIds)" },
          { status: 400 }
        );
      }
    }

    const hotel = user.hotels[0];
    const normalizedHotelName = normalizeHotel(hotel.hotelName);

    // If emailSendIds are provided, use them directly (more precise)
    // Otherwise, filter by date, amount, weight, protectors (backward compatibility)
    let matchingEmailSends;
    
    if (emailSendIds && Array.isArray(emailSendIds) && emailSendIds.length > 0) {
      // Use specific emailSend IDs - confirm only these exact ones
      // First verify these email sends belong to this user's hotel
      const allEmailSends = await prisma.dailySheetEmailSend.findMany({
        where: {
          id: {
            in: emailSendIds,
          },
          hotelName: {
            not: null,
          },
        },
      });

      // Filter to only include email sends for this user's hotel
      matchingEmailSends = allEmailSends.filter(
        (es) => normalizeHotel(es.hotelName) === normalizedHotelName
      );
    } else {
      // Fallback: filter by date, amount, weight, protectors (for backward compatibility)
      if (!date || !month || amount === undefined || weightKg === undefined || protectorsAmount === undefined) {
        return NextResponse.json(
          { error: "თარიღი, თვე, ფასი, წონა და დამცავები აუცილებელია" },
          { status: 400 }
        );
      }

      // Parse date and month
      const targetDate = new Date(date);
      const [year, monthNum] = month.split("-");
      const startOfMonth = new Date(Date.UTC(parseInt(year), parseInt(monthNum) - 1, 1, 0, 0, 0, 0));
      const endOfMonth = new Date(Date.UTC(parseInt(year), parseInt(monthNum), 0, 23, 59, 59, 999));

      // Get all email sends for this hotel and month
      const allEmailSends = await prisma.dailySheetEmailSend.findMany({
        where: {
          hotelName: {
            not: null,
          },
          date: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
      });

      const emailSends = allEmailSends.filter(
        (es) => normalizeHotel(es.hotelName) === normalizedHotelName
      );

      const targetAmount = parseFloat(amount.toFixed(2));
      const targetWeight = parseFloat(weightKg.toFixed(2));
      const targetProtectors = parseFloat(protectorsAmount.toFixed(2));

      matchingEmailSends = emailSends.filter((es) => {
        const esDate = new Date(es.date);
        const esDateKey = esDate.toISOString().split("T")[0];
        const targetDateKey = targetDate.toISOString().split("T")[0];
        
        if (esDateKey !== targetDateKey) return false;
        
        const esAmount = parseFloat((es.totalAmount || 0).toFixed(2));
        const esWeight = parseFloat((es.totalWeight || 0).toFixed(2));
        const esProtectors = parseFloat((es.protectorsAmount || 0).toFixed(2));
        
        return (
          Math.abs(esAmount - targetAmount) < 0.01 &&
          Math.abs(esWeight - targetWeight) < 0.01 &&
          Math.abs(esProtectors - targetProtectors) < 0.01
        );
      });
    }

    if (matchingEmailSends.length === 0) {
      return NextResponse.json(
        { error: "ინვოისი ვერ მოიძებნა" },
        { status: 404 }
      );
    }

    // Check if all matching email sends are already confirmed
    const allConfirmed = matchingEmailSends.every((es) => es.confirmedAt !== null && es.confirmedAt !== undefined);
    if (allConfirmed) {
      return NextResponse.json(
        { error: "ინვოისი უკვე დადასტურებულია" },
        { status: 400 }
      );
    }

    // Confirm all matching email sends (only those that are not already confirmed)
    const emailSendIdsToConfirm = matchingEmailSends
      .filter((es) => es.confirmedAt === null || es.confirmedAt === undefined)
      .map((es) => es.id);

    if (emailSendIdsToConfirm.length === 0) {
      return NextResponse.json(
        { error: "ყველა ინვოისი უკვე დადასტურებულია" },
        { status: 400 }
      );
    }

    const confirmedCount = await prisma.dailySheetEmailSend.updateMany({
      where: {
        id: {
          in: emailSendIdsToConfirm,
        },
        confirmedAt: null,
      },
      data: {
        confirmedBy: session.user.id,
        confirmedAt: new Date(),
      },
    });

    if (confirmedCount.count === 0) {
      return NextResponse.json(
        { error: "ყველა ინვოისი უკვე დადასტურებულია" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: "ინვოისი დაადასტურა",
      confirmedInvoices: confirmedCount.count,
    });
  } catch (error) {
    console.error("Single invoice confirmation error:", error);
    return NextResponse.json(
      { error: "დადასტურებისას მოხდა შეცდომა" },
      { status: 500 }
    );
  }
}

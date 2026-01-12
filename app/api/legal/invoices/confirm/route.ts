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

    const body = await request.json();
    const { date, month, amount, weightKg, protectorsAmount, emailSendIds, invoiceId } = body;

    const hotel = user.hotels[0];
    const normalizedHotelName = normalizeHotel(hotel.hotelName);

    console.log("Confirm invoice request:", {
      invoiceId,
      emailSendIds,
      date,
      month,
      amount,
      weightKg,
      protectorsAmount,
      hotelName: hotel.hotelName,
      normalizedHotelName,
    });

    let matchingEmailSends: any[] = [];

    // Priority 1: If invoiceId is provided, find Invoice record and match emailSends
    if (invoiceId) {
      const invoice = await prisma.legalInvoice.findUnique({
        where: { id: invoiceId },
      });

      if (!invoice) {
        return NextResponse.json(
          { error: "ინვოისი ვერ მოიძებნა" },
          { status: 404 }
        );
      }

      // Verify invoice belongs to this user's hotel
      if (normalizeHotel(invoice.customerName) !== normalizedHotelName) {
        return NextResponse.json(
          { error: "ინვოისი არ ეკუთვნის ამ სასტუმროს" },
          { status: 403 }
        );
      }

      // Find matching emailSends based on Invoice data
      // Use sentAt date if available (invoice sending date), otherwise use invoice.createdAt
      const invoiceDate = invoice.createdAt;
      const invoiceAmount = parseFloat((invoice.totalAmount ?? invoice.amount ?? 0).toFixed(2));

      // Get all email sends for this hotel
      const allEmailSends = await prisma.legalDailySheetEmailSend.findMany({
        where: {
          hotelName: {
            not: null,
          },
        },
      });

      const hotelEmailSends = allEmailSends.filter(
        (es) => normalizeHotel(es.hotelName) === normalizedHotelName
      );

      // Match emailSends to invoice - be more flexible
      // Since invoice can contain multiple emailSends, we need to find all emailSends
      // that were likely included in this invoice
      // Strategy: Find emailSends that were sent around the same time as invoice was created
      // and haven't been confirmed yet (or were confirmed at the same time as invoice creation)
      matchingEmailSends = hotelEmailSends.filter((es) => {
        // Use sentAt if available (invoice sending date), otherwise use date
        const esDate = es.sentAt || es.date;
        const dateDiff = Math.abs((new Date(esDate).getTime() - new Date(invoiceDate).getTime()) / (1000 * 60 * 60 * 24));
        
        // Allow up to 7 days difference - invoice might aggregate multiple days
        if (dateDiff > 7) return false;

        // If emailSend was already confirmed around the same time as invoice creation,
        // it was likely part of this invoice
        if (es.confirmedAt) {
          const confirmedDate = new Date(es.confirmedAt);
          const confirmedDiff = Math.abs((confirmedDate.getTime() - new Date(invoiceDate).getTime()) / (1000 * 60 * 60 * 24));
          if (confirmedDiff <= 1) {
            return true; // This emailSend was confirmed when invoice was sent
          }
        }

        // If not confirmed, check if it's within the invoice date range
        // and hasn't been confirmed yet (so user can confirm it now)
        if (!es.confirmedAt && dateDiff <= 7) {
          return true; // Unconfirmed emailSend within invoice date range
        }

        return false;
      });
    }
    // Priority 2: If emailSendIds are provided, use them directly
    else if (emailSendIds && Array.isArray(emailSendIds) && emailSendIds.length > 0) {
      // Use specific emailSend IDs - confirm only these exact ones
      const allEmailSends = await prisma.legalDailySheetEmailSend.findMany({
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
    }
    // Priority 3: Fallback - filter by date, amount, weight, protectors
    else {
      if (!date || !month || amount === undefined || weightKg === undefined || protectorsAmount === undefined) {
        return NextResponse.json(
          { error: "თარიღი, თვე, ფასი, წონა და დამცავები აუცილებელია (ან invoiceId/emailSendIds)" },
          { status: 400 }
        );
      }

      // Parse date and month
      const targetDate = new Date(date);
      const [year, monthNum] = month.split("-");
      const startOfMonth = new Date(Date.UTC(parseInt(year), parseInt(monthNum) - 1, 1, 0, 0, 0, 0));
      const endOfMonth = new Date(Date.UTC(parseInt(year), parseInt(monthNum), 0, 23, 59, 59, 999));

      // Get all email sends for this hotel and month
      const allEmailSends = await prisma.legalDailySheetEmailSend.findMany({
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

    // If no matching emailSends found but invoiceId was provided, try to find any emailSends
    // that were sent around the same time (they might have been confirmed already when invoice was sent)
    if (matchingEmailSends.length === 0 && invoiceId) {
      const invoice = await prisma.legalInvoice.findUnique({
        where: { id: invoiceId },
      });
      
      if (invoice) {
        const invoiceDate = new Date(invoice.createdAt);
        const allEmailSends = await prisma.legalDailySheetEmailSend.findMany({
          where: {
            hotelName: {
              not: null,
            },
          },
        });

        const hotelEmailSends = allEmailSends.filter(
          (es) => normalizeHotel(es.hotelName) === normalizedHotelName
        );

        // Find emailSends within 7 days of invoice creation (they were likely included in the invoice)
        // Use sentAt if available, otherwise use date
        matchingEmailSends = hotelEmailSends.filter((es) => {
          const esDate = es.sentAt || es.date;
          const dateDiff = Math.abs((new Date(esDate).getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24));
          return dateDiff <= 7; // Within 7 days
        });
      }
    }

    if (matchingEmailSends.length === 0) {
      console.log("No matching emailSends found. Debug info:", {
        invoiceId,
        emailSendIds,
        hotelName: hotel.hotelName,
        totalEmailSends: (await prisma.legalDailySheetEmailSend.findMany({
          where: { hotelName: { not: null } },
        })).filter(es => normalizeHotel(es.hotelName) === normalizedHotelName).length,
      });
      return NextResponse.json(
        { error: "ინვოისი ვერ მოიძებნა - შესაბამისი emailSends ვერ მოიძებნა" },
        { status: 404 }
      );
    }

    console.log(`Found ${matchingEmailSends.length} matching emailSends to confirm`);

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

    const confirmedCount = await prisma.legalDailySheetEmailSend.updateMany({
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

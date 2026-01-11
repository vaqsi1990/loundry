import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// Normalize hotel name for case-insensitive matching
const normalizeHotel = (name: string | null) => {
  if (!name) return "";
  return name.trim().replace(/\s+/g, " ").toLowerCase();
};

// Get invoices for legal person hotel grouped by month
// Invoices come from Invoice table (created when admin/manager sends invoices)
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
    const normalizedHotelName = normalizeHotel(hotel.hotelName);
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month"); // YYYY-MM format

    // Build date filter for month if specified
    let invoiceWhere: any = {};
    if (month) {
      const [year, monthNum] = month.split("-");
      const startOfMonth = new Date(Date.UTC(parseInt(year), parseInt(monthNum) - 1, 1, 0, 0, 0, 0));
      const endOfMonth = new Date(Date.UTC(parseInt(year), parseInt(monthNum), 0, 23, 59, 59, 999));
      invoiceWhere.createdAt = {
        gte: startOfMonth,
        lte: endOfMonth,
      };
    }

    // Get all Invoice records and filter by normalized hotel name (case-insensitive)
    const allInvoices = await prisma.invoice.findMany({
      where: invoiceWhere,
      orderBy: {
        createdAt: "desc",
      },
    });

    // Filter invoices by normalized hotel name (case-insensitive)
    const invoices = allInvoices.filter((inv) => 
      normalizeHotel(inv.customerName) === normalizedHotelName
    );

    // Also get emailSends to check confirmation status
    // When invoices are sent, the corresponding emailSends are confirmed
    const allEmailSends = await prisma.dailySheetEmailSend.findMany({
      where: {
        hotelName: {
          not: null,
        },
      },
    });

    const emailSends = allEmailSends.filter(
      (es) => normalizeHotel(es.hotelName) === normalizedHotelName
    );

    // Group invoices by month based on createdAt date
    const monthlyData = new Map<string, {
      month: string;
      totalAmount: number;
      paidAmount: number;
      remainingAmount: number;
      invoices: Array<{
        date: string;
        amount: number;
        paidAmount: number;
        remainingAmount: number;
        status: string;
        sentAt: string | null;
        weightKg: number;
        protectorsAmount: number;
        emailSendCount: number;
        confirmedAt: string | null;
        emailSendIds: string[]; // Invoice ID for tracking
        invoiceId: string; // Invoice record ID
      }>;
    }>();

    invoices.forEach((invoice) => {
      // Use UTC methods to avoid timezone issues
      const date = new Date(invoice.createdAt);
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, "0");
      const monthKey = `${year}-${month}`;
      
      const dateKey = invoice.createdAt.toISOString().split("T")[0];
      const weightKg = invoice.totalWeightKg || 0;
      const protectorsAmount = invoice.protectorsAmount || 0;
      const amount = invoice.totalAmount ?? invoice.amount ?? 0;
      const paidAmount = invoice.paidAmount ?? 0;
      const remainingAmount = amount - paidAmount;
      
      // Group by month
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, {
          month: monthKey,
          totalAmount: 0,
          paidAmount: 0,
          remainingAmount: 0,
          invoices: [],
        });
      }

      const monthData = monthlyData.get(monthKey)!;
      
      // Check if there are matching emailSends that were confirmed (when invoice was sent)
      // Match by date and amount (primary), weight and protectors (secondary, more flexible)
      let matchingEmailSends = emailSends.filter((es) => {
        const esDate = new Date(es.date);
        const invoiceDate = new Date(invoice.createdAt);
        
        // Check if dates are close (within 30 days, since invoice might be sent later)
        const dateDiff = Math.abs((esDate.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24));
        if (dateDiff > 30) return false;
        
        // Primary match: amount must match (within 0.01 tolerance)
        const esAmount = parseFloat((es.totalAmount || 0).toFixed(2));
        const invoiceAmount = parseFloat(amount.toFixed(2));
        if (Math.abs(esAmount - invoiceAmount) > 0.01) return false;
        
        // Secondary matches: weight and protectors (if both are available and > 0)
        // These are bonus checks, not required - allow some tolerance
        if (weightKg > 0 && es.totalWeight !== null && es.totalWeight !== undefined && es.totalWeight > 0) {
          const esWeight = parseFloat((es.totalWeight || 0).toFixed(2));
          // Allow up to 1kg difference since invoice might aggregate multiple sends
          if (Math.abs(esWeight - weightKg) > 1.0) return false;
        }
        
        if (protectorsAmount > 0 && es.protectorsAmount !== null && es.protectorsAmount !== undefined && es.protectorsAmount > 0) {
          const esProtectors = parseFloat((es.protectorsAmount || 0).toFixed(2));
          // Allow up to 1 GEL difference
          if (Math.abs(esProtectors - protectorsAmount) > 1.0) return false;
        }
        
        return true;
      });
      
      // If no exact matches found, try to find emailSends by date only (within 7 days)
      // This ensures we have emailSendIds for confirmation even if amounts don't match exactly
      if (matchingEmailSends.length === 0) {
        const invoiceDate = new Date(invoice.createdAt);
        matchingEmailSends = emailSends.filter((es) => {
          const esDate = new Date(es.date);
          const dateDiff = Math.abs((esDate.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24));
          return dateDiff <= 7; // Within 7 days of invoice creation
        });
      }
      
      // Get confirmation status from matching emailSends
      // If any matching emailSend is confirmed, consider the invoice confirmed
      const confirmedEmailSends = matchingEmailSends.filter(es => es.confirmedAt !== null);
      const confirmedAt = confirmedEmailSends.length > 0 && confirmedEmailSends[0].confirmedAt
        ? confirmedEmailSends[0].confirmedAt.toISOString()
        : null;
      
      // Get sentAt date from matching emailSends (daily sheet send date)
      // Use the earliest sentAt date from matching email sends, or fallback to invoice createdAt
      let sentAtDate: string | null = null;
      if (matchingEmailSends.length > 0) {
        const sentAtDates = matchingEmailSends
          .map(es => es.sentAt)
          .filter((date): date is Date => date !== null && date !== undefined)
          .sort((a, b) => a.getTime() - b.getTime()); // Sort ascending (earliest first)
        
        if (sentAtDates.length > 0) {
          sentAtDate = sentAtDates[0].toISOString(); // Use earliest sentAt date
        }
      }
      
      // Fallback to invoice createdAt if no sentAt found in emailSends
      if (!sentAtDate) {
        sentAtDate = invoice.createdAt.toISOString();
      }
      
      // Calculate status based on paid amount
      const isPaid = amount > 0 && (
        remainingAmount <= 0 || 
        Math.abs(remainingAmount) < 0.01 ||
        (paidAmount >= amount && Math.abs(paidAmount - amount) < 0.01)
      );
      
      // Add this invoice as a detail to the month's invoice
      monthData.totalAmount += amount;
      monthData.paidAmount += paidAmount;
      monthData.invoices.push({
        date: dateKey,
        amount,
        paidAmount,
        remainingAmount,
        status: isPaid ? "PAID" : "PENDING",
        sentAt: sentAtDate, // Use daily sheet email send date (sentAt from DailySheetEmailSend)
        weightKg,
        protectorsAmount,
        emailSendCount: matchingEmailSends.length || 1, // Count of matching email sends
        confirmedAt,
        emailSendIds: matchingEmailSends.map(es => es.id), // IDs of matching email sends
        invoiceId: invoice.id, // Invoice record ID
      });
    });

    // Calculate month-level totals
    monthlyData.forEach((monthData) => {
      monthData.remainingAmount = monthData.totalAmount - monthData.paidAmount;
    });

    // Get revenue data for each month from Revenue table (entered in /admin/revenues)
    const revenuesByMonth = new Map<string, Array<{
      id: string;
      source: string;
      description: string;
      amount: number;
      date: string;
    }>>();

    // Get all revenues and group by month
    const allRevenues = await prisma.revenue.findMany({
      orderBy: {
        date: "desc",
      },
      select: {
        id: true,
        source: true,
        description: true,
        amount: true,
        date: true,
      },
    });

    allRevenues.forEach((revenue) => {
      const revenueDate = new Date(revenue.date);
      const year = revenueDate.getUTCFullYear();
      const month = String(revenueDate.getUTCMonth() + 1).padStart(2, "0");
      const monthKey = `${year}-${month}`;
      
      if (!revenuesByMonth.has(monthKey)) {
        revenuesByMonth.set(monthKey, []);
      }
      revenuesByMonth.get(monthKey)!.push({
        id: revenue.id,
        source: revenue.source,
        description: revenue.description,
        amount: revenue.amount,
        date: revenue.date.toISOString(),
      });
    });

    // Build result with confirmation status
    const result = Array.from(monthlyData.values()).map((data) => {
      // Check if ALL invoice details are confirmed
      const allDetailsConfirmed = data.invoices.length > 0 && data.invoices.every(inv => inv.confirmedAt !== null && inv.confirmedAt !== undefined);
      
      // If all details are confirmed, use the earliest confirmation date, otherwise null
      const monthConfirmedAt = allDetailsConfirmed 
        ? data.invoices
            .map(inv => inv.confirmedAt)
            .filter((date): date is string => date !== null && date !== undefined)
            .sort()[0] // Get earliest confirmation date
        : null;
      
      // Calculate status more accurately with floating point tolerance
      const isFullyPaid = data.totalAmount > 0 && (
        data.remainingAmount <= 0 || 
        Math.abs(data.remainingAmount) < 0.01 ||
        (data.paidAmount >= data.totalAmount && Math.abs(data.paidAmount - data.totalAmount) < 0.01)
      );
      
      // Get revenues for this month
      const monthRevenues = revenuesByMonth.get(data.month) || [];
      const totalRevenueAmount = monthRevenues.reduce((sum, rev) => sum + rev.amount, 0);
      
      return {
        ...data,
        status: isFullyPaid ? "PAID" : "PENDING",
        isPaid: isFullyPaid,
        confirmedAt: monthConfirmedAt || null,
        revenues: monthRevenues,
        totalRevenueAmount: totalRevenueAmount,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Legal invoices fetch error:", error);
    return NextResponse.json(
      { error: "ინვოისების ჩატვირთვისას მოხდა შეცდომა" },
      { status: 500 }
    );
  }
}

// Update payment for a month
export async function PUT(request: NextRequest) {
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
    const { month, paidAmount, confirm } = body;

    if (!month) {
      return NextResponse.json(
        { error: "თვე აუცილებელია" },
        { status: 400 }
      );
    }

    // If confirm is true, confirm all daily sheets for this month
    if (confirm === true) {
      const [year, monthNum] = month.split("-");
      const startOfMonth = new Date(Date.UTC(parseInt(year), parseInt(monthNum) - 1, 1, 0, 0, 0, 0));
      const endOfMonth = new Date(Date.UTC(parseInt(year), parseInt(monthNum), 0, 23, 59, 59, 999));

      const hotel = user.hotels[0];
      const normalizedHotelName = normalizeHotel(hotel.hotelName);

      // Get all daily sheets for this hotel and month
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
        include: {
          dailySheet: true,
        },
      });

      const emailSends = allEmailSends.filter(
        (es) => normalizeHotel(es.hotelName) === normalizedHotelName
      );

      // Check if there are any email sends for this month
      if (emailSends.length === 0) {
        return NextResponse.json({ 
          error: "ამ თვისთვის ინვოისები არ მოიძებნა",
        }, { status: 404 });
      }

      // Check if all email sends are already confirmed
      const allConfirmed = emailSends.every((es) => es.confirmedAt !== null && es.confirmedAt !== undefined);
      if (allConfirmed && emailSends.length > 0) {
        return NextResponse.json({ 
          error: "ინვოისი უკვე დადასტურებულია",
          alreadyConfirmed: true
        }, { status: 400 });
      }

      // Get email send IDs that are not yet confirmed
      const emailSendIds = emailSends
        .filter((es) => es.confirmedAt === null || es.confirmedAt === undefined)
        .map((es) => es.id);

      // Check if there are any email sends to confirm
      if (emailSendIds.length === 0) {
        return NextResponse.json({ 
          error: "ყველა ინვოისი უკვე დადასტურებულია",
          alreadyConfirmed: true
        }, { status: 400 });
      }

      // Confirm all email sends for this month (only those that are not already confirmed)
      const confirmedCount = await prisma.dailySheetEmailSend.updateMany({
        where: {
          id: {
            in: emailSendIds,
          },
          confirmedAt: null, // Only update email sends that are not already confirmed
        },
        data: {
          confirmedBy: session.user.id,
          confirmedAt: new Date(),
        },
      });

      // Check if any email sends were actually updated
      if (confirmedCount.count === 0) {
        return NextResponse.json({ 
          error: "ყველა ინვოისი უკვე დადასტურებულია",
          alreadyConfirmed: true
        }, { status: 400 });
      }

      return NextResponse.json({ 
        message: "ინვოისი დაადასტურა", 
        confirmedInvoices: confirmedCount.count 
      });
    }

    const paid = paidAmount !== undefined ? parseFloat(paidAmount) : 0;
    if (isNaN(paid) || paid < 0) {
      return NextResponse.json(
        { error: "არასწორი გადახდილი თანხა" },
        { status: 400 }
      );
    }

    // Calculate total amount for this month to determine if fully paid
    const hotel = user.hotels[0];
    const [year, monthNum] = month.split("-");
    const startOfMonth = new Date(Date.UTC(parseInt(year), parseInt(monthNum) - 1, 1, 0, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(parseInt(year), parseInt(monthNum), 0, 23, 59, 59, 999));

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

    const normalizedHotelName = normalizeHotel(hotel.hotelName);
    const emailSends = allEmailSends.filter(
      (es) => normalizeHotel(es.hotelName) === normalizedHotelName
    );

    // Count each email send separately - if same sheet was sent multiple times, count each time
    const totalAmount = emailSends.reduce((sum, send) => sum + (send.totalAmount || 0), 0);
    const isPaid = paid >= totalAmount && totalAmount > 0;

    // Upsert payment record
    const payment = await (prisma as any).legalInvoicePayment.upsert({
      where: {
        userId_month: {
          userId: session.user.id,
          month: month,
        },
      },
      update: {
        paidAmount: paid,
        isPaid: isPaid,
      },
      create: {
        userId: session.user.id,
        month: month,
        paidAmount: paid,
        isPaid: isPaid,
      },
    });

    return NextResponse.json({ message: "გადახდა განახლდა", payment });
  } catch (error) {
    console.error("Legal invoice payment update error:", error);
    return NextResponse.json(
      { error: "გადახდის განახლებისას მოხდა შეცდომა" },
      { status: 500 }
    );
  }
}

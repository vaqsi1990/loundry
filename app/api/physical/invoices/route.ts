import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// Get invoices for physical person hotel grouped by month
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

    // Normalize hotel name for case-insensitive matching
    const normalizeHotel = (name: string | null) => {
      if (!name) return "";
      return name.trim().replace(/\s+/g, " ").toLowerCase();
    };

    // Get all email sends and filter by normalized hotel name
    const allEmailSends = await prisma.dailySheetEmailSend.findMany({
      where: {
        hotelName: {
          not: null,
        },
      },
      include: {
        dailySheet: {
          include: {
            items: true,
          },
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    const normalizedHotelName = normalizeHotel(hotel.hotelName);
    let emailSends = allEmailSends.filter(
      (es) => normalizeHotel(es.hotelName) === normalizedHotelName
    );

    // Filter by month if specified
    if (month) {
      const [year, monthNum] = month.split("-");
      const startOfMonth = new Date(Date.UTC(parseInt(year), parseInt(monthNum) - 1, 1, 0, 0, 0, 0));
      const endOfMonth = new Date(Date.UTC(parseInt(year), parseInt(monthNum), 0, 23, 59, 59, 999));
      emailSends = emailSends.filter((es) => {
        const esDate = new Date(es.date);
        return esDate >= startOfMonth && esDate <= endOfMonth;
      });
    }

    // Group by month - count each email send separately (even if same sheet sent multiple times)
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
      }>;
    }>();

    emailSends.forEach((emailSend) => {
      // Use UTC methods to avoid timezone issues
      const date = new Date(emailSend.date);
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, "0");
      const monthKey = `${year}-${month}`;
      
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
      const amount = emailSend.totalAmount || 0;
      
      // Count each email send separately - if same sheet was sent multiple times, count each time
      monthData.totalAmount += amount;
      monthData.invoices.push({
        date: emailSend.date.toISOString().split("T")[0],
        amount,
        paidAmount: 0, // Will be updated from Invoice table
        remainingAmount: amount,
        status: "PENDING",
        sentAt: emailSend.sentAt ? emailSend.sentAt.toISOString() : null,
        weightKg: emailSend.totalWeight || 0,
        protectorsAmount: emailSend.protectorsAmount || 0,
        emailSendCount: 1, // Each email send counts as 1
      });
    });

    // Get physical invoice payments for this user
    const physicalPayments = await prisma.physicalInvoicePayment.findMany({
      where: {
        userId: session.user.id,
      },
    });

    // Update paid amounts from physical payments
    const paymentMap = new Map<string, { paidAmount: number; isPaid: boolean }>();
    physicalPayments.forEach((payment: any) => {
      paymentMap.set(payment.month, {
        paidAmount: payment.paidAmount || 0,
        isPaid: payment.isPaid || false,
      });
      if (monthlyData.has(payment.month)) {
        const monthData = monthlyData.get(payment.month)!;
        monthData.paidAmount = payment.paidAmount || 0;
        monthData.remainingAmount = monthData.totalAmount - monthData.paidAmount;
      }
    });

    const result = Array.from(monthlyData.values()).map((data) => {
      const payment = paymentMap.get(data.month);
      return {
        ...data,
        status: data.remainingAmount <= 0 ? "PAID" : "PENDING",
        isPaid: payment?.isPaid || false,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Physical invoices fetch error:", error);
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
    const { month, paidAmount } = body;

    if (!month) {
      return NextResponse.json(
        { error: "თვე აუცილებელია" },
        { status: 400 }
      );
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
    
    // Normalize hotel name for case-insensitive matching
    const normalizeHotel = (name: string | null) => {
      if (!name) return "";
      return name.trim().replace(/\s+/g, " ").toLowerCase();
    };

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
    const payment = await prisma.physicalInvoicePayment.upsert({
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
    console.error("Physical invoice payment update error:", error);
    return NextResponse.json(
      { error: "გადახდის განახლებისას მოხდა შეცდომა" },
      { status: 500 }
    );
  }
}


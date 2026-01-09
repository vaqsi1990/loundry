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

    // Get email sends for this hotel
    const emailSendsWhere: any = {
      hotelName: hotel.hotelName,
    };

    if (month) {
      const [year, monthNum] = month.split("-");
      const startOfMonth = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
      const endOfMonth = new Date(parseInt(year), parseInt(monthNum), 0, 23, 59, 59, 999);
      emailSendsWhere.date = {
        gte: startOfMonth,
        lte: endOfMonth,
      };
    }

    const emailSends = await prisma.dailySheetEmailSend.findMany({
      where: emailSendsWhere,
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

    // Group by month
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
      }>;
    }>();

    emailSends.forEach((emailSend) => {
      const date = new Date(emailSend.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      
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
      
      monthData.totalAmount += amount;
      monthData.invoices.push({
        date: emailSend.date.toISOString().split("T")[0],
        amount,
        paidAmount: 0, // Will be updated from Invoice table
        remainingAmount: amount,
        status: "PENDING",
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
    const startOfMonth = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
    const endOfMonth = new Date(parseInt(year), parseInt(monthNum), 0, 23, 59, 59, 999);
    
    const emailSends = await prisma.dailySheetEmailSend.findMany({
      where: {
        hotelName: hotel.hotelName,
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });

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


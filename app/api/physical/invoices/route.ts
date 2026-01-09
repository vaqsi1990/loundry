import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// Normalize hotel name for case-insensitive matching
const normalizeHotel = (name: string | null) => {
  if (!name) return "";
  return name.trim().replace(/\s+/g, " ").toLowerCase();
};

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
      const dateKey = emailSend.date.toISOString().split("T")[0];
      const weightKg = emailSend.totalWeight || 0;
      const protectorsAmount = emailSend.protectorsAmount || 0;
      
      // Count each email send separately for totalAmount (if same sheet was sent multiple times, count each time)
      monthData.totalAmount += amount;
      
      // Track unique invoices per month to avoid duplicates in details
      // Create unique key: date + amount + weight + protectors (within the same month)
      const detailKey = `${dateKey}-${amount.toFixed(2)}-${weightKg.toFixed(2)}-${protectorsAmount.toFixed(2)}`;
      
      // Check if this invoice detail already exists in this month
      const existingDetail = monthData.invoices.find(inv => {
        const invDateKey = inv.date;
        const invAmount = inv.amount.toFixed(2);
        const invWeight = inv.weightKg.toFixed(2);
        const invProtectors = inv.protectorsAmount.toFixed(2);
        return `${invDateKey}-${invAmount}-${invWeight}-${invProtectors}` === detailKey;
      });
      
      if (existingDetail) {
        // If duplicate found, increment emailSendCount but keep other values
        existingDetail.emailSendCount += 1;
        // Keep the most recent sentAt if available
        if (emailSend.sentAt && (!existingDetail.sentAt || new Date(emailSend.sentAt) > new Date(existingDetail.sentAt))) {
          existingDetail.sentAt = emailSend.sentAt.toISOString();
        }
      } else {
        // Add new unique invoice detail
        monthData.invoices.push({
          date: dateKey,
          amount,
          paidAmount: 0,
          remainingAmount: amount,
          status: "PENDING",
          sentAt: emailSend.sentAt ? emailSend.sentAt.toISOString() : null,
          weightKg,
          protectorsAmount,
          emailSendCount: 1,
        });
      }
    });

    // Get paid amounts from Invoice table (updated by admin in /admin/revenues)
    // Group invoices by month and sum paidAmount for each month
    const invoicePaidAmounts = new Map<string, number>();
    
    // Get all invoices for this hotel
    const allInvoices = await prisma.invoice.findMany({
      select: {
        customerName: true,
        paidAmount: true,
        createdAt: true,
      },
    });

    // Use the already normalized hotel name from above
    
    // Filter invoices for this hotel and group by month
    allInvoices.forEach((invoice) => {
      if (normalizeHotel(invoice.customerName) === normalizedHotelName) {
        const invoiceDate = new Date(invoice.createdAt);
        const year = invoiceDate.getUTCFullYear();
        const month = String(invoiceDate.getUTCMonth() + 1).padStart(2, "0");
        const monthKey = `${year}-${month}`;
        
        const currentPaid = invoicePaidAmounts.get(monthKey) || 0;
        invoicePaidAmounts.set(monthKey, currentPaid + (invoice.paidAmount || 0));
      }
    });

    // Update paid amounts from Invoice table
    invoicePaidAmounts.forEach((paidAmount, monthKey) => {
      if (monthlyData.has(monthKey)) {
        const monthData = monthlyData.get(monthKey)!;
        monthData.paidAmount = paidAmount;
        monthData.remainingAmount = monthData.totalAmount - monthData.paidAmount;
      }
    });

    const result = Array.from(monthlyData.values()).map((data) => {
      return {
        ...data,
        status: data.remainingAmount <= 0 && data.totalAmount > 0 ? "PAID" : "PENDING",
        isPaid: data.remainingAmount <= 0 && data.totalAmount > 0,
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


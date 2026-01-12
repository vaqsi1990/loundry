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
    // Get emailSends filtered by month if specified
    let emailSendWhere: any = {
      hotelName: {
        not: null,
      },
    };
    
    if (month) {
      const [year, monthNum] = month.split("-");
      const startOfMonth = new Date(Date.UTC(parseInt(year), parseInt(monthNum) - 1, 1, 0, 0, 0, 0));
      const endOfMonth = new Date(Date.UTC(parseInt(year), parseInt(monthNum), 0, 23, 59, 59, 999));
      emailSendWhere.date = {
        gte: startOfMonth,
        lte: endOfMonth,
      };
    }

    const allEmailSends = await prisma.dailySheetEmailSend.findMany({
      where: emailSendWhere,
      include: {
        dailySheet: {
          include: {
            items: true,
          },
        },
      },
      orderBy: {
        date: "asc",
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
        dailySheetDate: string | null; // DailySheet date
        weightKg: number;
        protectorsAmount: number;
        emailSendCount: number;
        confirmedAt: string | null;
        emailSendIds: string[]; // Invoice ID for tracking
        invoiceId: string; // Invoice record ID
      }>;
    }>();

    // Create invoice detail rows from emailSends (like PDF does - one row per emailSend)
    // Get price per kg from hotel
    const pricePerKg = hotel.pricePerKg || 1.8;
    
    // Create a map to track which invoices contain which emailSends
    const invoiceEmailSendMap = new Map<string, string[]>(); // invoiceId -> emailSendIds[]
    
    // First, match invoices to emailSends to track relationships
    invoices.forEach((invoice) => {
      const invoiceDate = new Date(invoice.createdAt);
      const invoiceAmount = invoice.totalAmount ?? invoice.amount ?? 0;
      const invoiceWeight = invoice.totalWeightKg || 0;
      const invoiceProtectors = invoice.protectorsAmount || 0;
      
      // Find emailSends that match this invoice
      const matchingEmailSends = emailSends.filter((es) => {
        const esDate = new Date(es.date);
        const dateDiff = Math.abs((esDate.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24));
        if (dateDiff > 30) return false;
        
        const esAmount = parseFloat((es.totalAmount || 0).toFixed(2));
        const invAmount = parseFloat(invoiceAmount.toFixed(2));
        if (Math.abs(esAmount - invAmount) > 0.01) return false;
        
        return true;
      });
      
      if (matchingEmailSends.length > 0) {
        invoiceEmailSendMap.set(invoice.id, matchingEmailSends.map(es => es.id));
      }
    });
    
    // Now create one row per emailSend (like PDF structure)
    emailSends.forEach((emailSend) => {
      const esDate = new Date(emailSend.date);
      const year = esDate.getUTCFullYear();
      const month = String(esDate.getUTCMonth() + 1).padStart(2, "0");
      const monthKey = `${year}-${month}`;
      
      const dateKey = emailSend.date.toISOString().split("T")[0];
      
      // Calculate amount for this emailSend (like PDF does)
      const weight = emailSend.totalWeight ?? 0;
      const protectorsAmount = emailSend.protectorsAmount ?? 0;
      
      let itemAmount = 0;
      
      if (weight > 0) {
        // Check if this sheet has tablecloths (სუფრები)
        const hasTablecloths = emailSend.dailySheet?.items?.some(
          (item: any) => item.itemNameKa?.toLowerCase().includes("სუფრ")
        ) || false;
        
        if (hasTablecloths) {
          // Separate regular linen and tablecloths
          const tableclothsItems = emailSend.dailySheet?.items?.filter(
            (item: any) => item.itemNameKa?.toLowerCase().includes("სუფრ")
          ) || [];
          const regularItems = emailSend.dailySheet?.items?.filter(
            (item: any) => !item.itemNameKa?.toLowerCase().includes("სუფრ")
          ) || [];
          
          const tableclothsWeight = tableclothsItems.reduce(
            (sum, item: any) => sum + (item.totalWeight || item.weight || 0), 
            0
          );
          const regularWeight = regularItems.reduce(
            (sum, item: any) => sum + (item.totalWeight || item.weight || 0), 
            0
          );
          
          // Add regular linen amount
          if (regularWeight > 0) {
            itemAmount += regularWeight * pricePerKg;
          }
          
          // Add tablecloths amount
          if (tableclothsWeight > 0) {
            const tableclothsPrice = 3.00;
            itemAmount += tableclothsWeight * tableclothsPrice;
          }
        } else {
          // Regular linen item (no tablecloths)
          itemAmount = weight * pricePerKg;
        }
      }
      
      // Add protectors amount
      itemAmount += protectorsAmount;
      
      // Find which invoice this emailSend belongs to
      let invoiceId: string | undefined;
      let paidAmount = 0;
      let confirmedAt: string | null = null;
      
      for (const [invId, emailSendIds] of invoiceEmailSendMap.entries()) {
        if (emailSendIds.includes(emailSend.id)) {
          invoiceId = invId;
          const invoice = invoices.find(inv => inv.id === invId);
          if (invoice) {
            // Distribute paid amount proportionally
            const invoiceTotal = invoice.totalAmount ?? invoice.amount ?? 0;
            const invoicePaid = invoice.paidAmount ?? 0;
            if (invoiceTotal > 0) {
              paidAmount = (itemAmount / invoiceTotal) * invoicePaid;
            }
          }
          break;
        }
      }
      
      // Get confirmation status
      if (emailSend.confirmedAt) {
        confirmedAt = emailSend.confirmedAt.toISOString();
      }
      
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
      
      // Calculate remaining amount for this item
      const remainingAmount = itemAmount - paidAmount;
      const isPaid = itemAmount > 0 && (
        remainingAmount <= 0 || 
        Math.abs(remainingAmount) < 0.01 ||
        (paidAmount >= itemAmount && Math.abs(paidAmount - itemAmount) < 0.01)
      );
      
      // Add this emailSend as a separate invoice detail row
      monthData.totalAmount += itemAmount;
      monthData.paidAmount += paidAmount;
      monthData.invoices.push({
        date: dateKey,
        amount: itemAmount,
        paidAmount,
        remainingAmount,
        status: isPaid ? "PAID" : "PENDING",
        sentAt: emailSend.sentAt?.toISOString() || null,
        dailySheetDate: emailSend.date.toISOString(), // Use emailSend date directly
        weightKg: weight,
        protectorsAmount,
        emailSendCount: 1, // Each row represents one emailSend
        confirmedAt,
        emailSendIds: [emailSend.id],
        invoiceId: invoiceId || "", // Invoice record ID if found
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


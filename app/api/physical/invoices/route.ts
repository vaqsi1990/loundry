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

    // Create a separate invoice entry for each emailSend (no grouping)
    // Group by month for display purposes, but each emailSend is a separate invoice
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
        emailSendIds: string[]; // IDs of emailSends that belong to this invoice detail
      }>;
    }>();

    emailSends.forEach((emailSend) => {
      // Use UTC methods to avoid timezone issues
      const date = new Date(emailSend.date);
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, "0");
      const monthKey = `${year}-${month}`;
      
      const amount = emailSend.totalAmount || 0;
      const dateKey = emailSend.date.toISOString().split("T")[0];
      const weightKg = emailSend.totalWeight || 0;
      const protectorsAmount = emailSend.protectorsAmount || 0;
      
      // Create unique key for this invoice: month + emailSend.id
      // This ensures each emailSend is a separate invoice entry
      const uniqueInvoiceKey = `${monthKey}-${emailSend.id}`;
      
      if (!monthlyData.has(uniqueInvoiceKey)) {
        monthlyData.set(uniqueInvoiceKey, {
          month: monthKey,
          totalAmount: 0,
          paidAmount: 0,
          remainingAmount: 0,
          invoices: [],
        });
      }

      const monthData = monthlyData.get(uniqueInvoiceKey)!;
      
      // Get confirmation status from emailSend (not dailySheet)
      const emailSendConfirmedAt = emailSend.confirmedAt ? emailSend.confirmedAt.toISOString() : null;
      
      // Each emailSend is a separate invoice with a single detail
      monthData.totalAmount += amount;
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
        confirmedAt: emailSendConfirmedAt,
        emailSendIds: [emailSend.id], // Each invoice detail has only one emailSend ID
      });
    });

    // Get paid amounts from Invoice table (updated by admin in /admin/revenues)
    // Match Invoice records with emailSend records by date, amount, weight, and protectors
    const invoicePaidAmounts = new Map<string, number>(); // Map emailSend.id -> paidAmount
    
    // Get all invoices for this hotel with more details for matching
    // Include id to properly track which invoices have been used
    type InvoiceSelect = {
      id: string;
      customerName: string;
      totalAmount: number | null;
      amount: number;
      totalWeightKg: number | null;
      protectorsAmount: number | null;
      paidAmount: number | null;
      createdAt: Date;
    };
    
    const allInvoices: InvoiceSelect[] = await prisma.invoice.findMany({
      select: {
        id: true,
        customerName: true,
        totalAmount: true,
        amount: true,
        totalWeightKg: true,
        protectorsAmount: true,
        paidAmount: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc", // Newer invoices first
      },
    });

    // Match Invoice records with emailSend records
    // Try to match by: hotel name, amount (primary), then date, weight, protectors
    // Use a more flexible matching approach - prioritize amount match, then other fields
    // Track which invoices have been used to avoid duplicate matches
    const usedInvoiceIds = new Set<string>();
    
    emailSends.forEach((emailSend) => {
      const emailSendDate = new Date(emailSend.date);
      const emailSendDateKey = emailSendDate.toISOString().split("T")[0];
      const emailSendAmount = parseFloat((emailSend.totalAmount || 0).toFixed(2));
      const emailSendWeight = parseFloat((emailSend.totalWeight || 0).toFixed(2));
      const emailSendProtectors = parseFloat((emailSend.protectorsAmount || 0).toFixed(2));
      
      // First, filter by hotel name
      const hotelInvoices = allInvoices.filter(
        (invoice) => {
          return normalizeHotel(invoice.customerName) === normalizedHotelName;
        }
      );
      
      // Find best matching invoice - prioritize exact matches, then partial matches
      // Score each potential match and pick the best one
      let bestMatchInvoice: InvoiceSelect | null = null;
      let bestScore = 0;
      
      hotelInvoices.forEach((invoice) => {
        // Skip if this invoice was already matched to another emailSend
        if (usedInvoiceIds.has(invoice.id)) {
          return;
        }
        
        const invoiceAmount = parseFloat((invoice.totalAmount ?? invoice.amount ?? 0).toFixed(2));
        let score = 0;
        
        // Must match amount exactly (required) - this is the primary matching criteria
        if (Math.abs(invoiceAmount - emailSendAmount) >= 0.01) {
          return;
        }
        score += 100; // Base score for amount match
        
        // Check date (closer dates score higher, but allow up to 30 days for flexibility)
        const invoiceDate = new Date(invoice.createdAt);
        const dateDiff = Math.abs((invoiceDate.getTime() - emailSendDate.getTime()) / (1000 * 60 * 60 * 24));
        if (dateDiff <= 1) {
          score += 50; // Same day or next day
        } else if (dateDiff <= 3) {
          score += 30; // Within 3 days
        } else if (dateDiff <= 7) {
          score += 20; // Within 7 days
        } else if (dateDiff <= 30) {
          score += 10; // Within 30 days (more flexible)
        } else {
          // Still allow matching if amount matches, but with lower priority
          score += 5;
        }
        
        // Check weight (if both are available and > 0) - bonus points, not required
        if (invoice.totalWeightKg !== null && invoice.totalWeightKg !== undefined && 
            emailSendWeight > 0 && invoice.totalWeightKg > 0) {
          const invoiceWeight = parseFloat((invoice.totalWeightKg || 0).toFixed(2));
          if (Math.abs(invoiceWeight - emailSendWeight) < 0.01) {
            score += 20; // Weight matches
          } else if (Math.abs(invoiceWeight - emailSendWeight) < 1.0) {
            score += 10; // Weight close (within 1kg)
          }
        }
        
        // Check protectors (if both are available and > 0) - bonus points, not required
        if (invoice.protectorsAmount !== null && invoice.protectorsAmount !== undefined &&
            emailSendProtectors > 0 && invoice.protectorsAmount > 0) {
          const invoiceProtectors = parseFloat((invoice.protectorsAmount || 0).toFixed(2));
          if (Math.abs(invoiceProtectors - emailSendProtectors) < 0.01) {
            score += 20; // Protectors match
          } else if (Math.abs(invoiceProtectors - emailSendProtectors) < 1.0) {
            score += 10; // Protectors close (within 1 GEL)
          }
        }
        
        // Update best match if this one scores higher
        if (score > bestScore) {
          bestMatchInvoice = invoice;
          bestScore = score;
        }
      });
      
      // If we found a match with amount matching (score >= 100), use it
      if (bestMatchInvoice !== null && bestScore >= 100 && bestMatchInvoice) {
        // TypeScript type narrowing - bestMatchInvoice is guaranteed to be InvoiceSelect here
        const match: InvoiceSelect = bestMatchInvoice;
        // Mark this invoice as used
        usedInvoiceIds.add(match.id);
        // Set paid amount (use 0 if null/undefined)
        const paidAmount = match.paidAmount ?? 0;
        invoicePaidAmounts.set(emailSend.id, paidAmount);
        
        // Debug logging
        console.log(`Matched emailSend ${emailSend.id} (${emailSendDateKey}, ${emailSendAmount}₾) to Invoice ${match.id} (paid: ${paidAmount}₾, score: ${bestScore})`);
      } else {
        // Debug logging for unmatched email sends
        console.log(`No match found for emailSend ${emailSend.id} (${emailSendDateKey}, ${emailSendAmount}₾, hotel: ${normalizedHotelName})`);
      }
    });
    
    console.log(`Total email sends: ${emailSends.length}, Matched invoices: ${invoicePaidAmounts.size}, Total invoices in DB: ${allInvoices.length}`);

    // Update paid amounts for each invoice detail
    monthlyData.forEach((monthData, uniqueKey) => {
      monthData.invoices.forEach((invoiceDetail) => {
        const emailSendId = invoiceDetail.emailSendIds[0];
        if (emailSendId && invoicePaidAmounts.has(emailSendId)) {
          const paidAmount = invoicePaidAmounts.get(emailSendId)!;
          invoiceDetail.paidAmount = paidAmount;
          invoiceDetail.remainingAmount = invoiceDetail.amount - paidAmount;
          // Update status based on paid amount with floating point tolerance
          const isDetailPaid = invoiceDetail.amount > 0 && (
            invoiceDetail.remainingAmount <= 0 || 
            Math.abs(invoiceDetail.remainingAmount) < 0.01 ||
            (paidAmount >= invoiceDetail.amount && Math.abs(paidAmount - invoiceDetail.amount) < 0.01)
          );
          invoiceDetail.status = isDetailPaid ? "PAID" : "PENDING";
        } else {
          // No matching invoice found, keep defaults
          invoiceDetail.paidAmount = 0;
          invoiceDetail.remainingAmount = invoiceDetail.amount;
          invoiceDetail.status = "PENDING";
        }
      });
      
      // Update month-level totals
      monthData.paidAmount = monthData.invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
      monthData.remainingAmount = monthData.totalAmount - monthData.paidAmount;
    });

    // Get confirmation status for each invoice from DailySheetEmailSend records
    // Since each invoice now has only one emailSend, check that emailSend's confirmation status
    const invoiceConfirmations = new Map<string, string | null>();
    
    // Map each unique invoice key to its emailSend confirmation status
    monthlyData.forEach((data, uniqueKey) => {
      // Each invoice has exactly one detail with one emailSend ID
      const emailSendId = data.invoices[0]?.emailSendIds?.[0];
      if (emailSendId) {
        const emailSend = emailSends.find(es => es.id === emailSendId);
        if (emailSend && emailSend.confirmedAt) {
          invoiceConfirmations.set(uniqueKey, emailSend.confirmedAt.toISOString());
        } else {
          invoiceConfirmations.set(uniqueKey, null);
        }
      } else {
        invoiceConfirmations.set(uniqueKey, null);
      }
    });

    const result = Array.from(monthlyData.values()).map((data) => {
      // Find the unique key for this data
      const uniqueKey = Array.from(monthlyData.entries()).find(([key, value]) => value === data)?.[0];
      const confirmedAt = uniqueKey ? invoiceConfirmations.get(uniqueKey) : null;
      
      // Check if ALL invoice details are confirmed
      // Month-level invoice is confirmed only if all details are confirmed
      const allDetailsConfirmed = data.invoices.length > 0 && data.invoices.every(inv => inv.confirmedAt !== null && inv.confirmedAt !== undefined);
      
      // If all details are confirmed, use the earliest confirmation date, otherwise null
      const monthConfirmedAt = allDetailsConfirmed 
        ? data.invoices
            .map(inv => inv.confirmedAt)
            .filter((date): date is string => date !== null && date !== undefined)
            .sort()[0] // Get earliest confirmation date
        : null;
      
      // Calculate status more accurately with floating point tolerance
      // Invoice is PAID if remaining amount is <= 0 (or very close to 0 due to floating point)
      const isFullyPaid = data.totalAmount > 0 && (
        data.remainingAmount <= 0 || 
        Math.abs(data.remainingAmount) < 0.01 ||
        (data.paidAmount >= data.totalAmount && Math.abs(data.paidAmount - data.totalAmount) < 0.01)
      );
      
      return {
        ...data,
        status: isFullyPaid ? "PAID" : "PENDING",
        isPaid: isFullyPaid,
        confirmedAt: monthConfirmedAt || confirmedAt || null,
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


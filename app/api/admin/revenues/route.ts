import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

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
      select: { role: true },
    });

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "დაუშვებელია" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const view = searchParams.get("view");
    const date = searchParams.get("date");
    const month = searchParams.get("month");

    let revenueWhere: any = {};
    let invoiceWhere: any = {
      customerEmail: {
        not: null,
      },
    };

    if (view === "daily" && date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      revenueWhere.date = {
        gte: startOfDay,
        lte: endOfDay,
      };
      invoiceWhere.createdAt = {
        gte: startOfDay,
        lte: endOfDay,
      };
    } else if (view === "monthly" && month) {
      const startOfMonth = new Date(`${month}-01`);
      const endOfMonth = new Date(startOfMonth);
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);
      endOfMonth.setDate(0);
      endOfMonth.setHours(23, 59, 59, 999);
      revenueWhere.date = {
        gte: startOfMonth,
        lte: endOfMonth,
      };
      invoiceWhere.createdAt = {
        gte: startOfMonth,
        lte: endOfMonth,
      };
    }

    const revenues = await prisma.revenue.findMany({
      where: revenueWhere,
      orderBy: {
        date: "desc",
      },
    });

    // Fetch invoices that have been sent to hotels (have customerEmail)
    const allSentInvoices = await prisma.invoice.findMany({
      where: invoiceWhere,
      orderBy: {
        createdAt: "asc", // Order by oldest first to get first invoice per hotel
      },
      select: {
        id: true,
        invoiceNumber: true,
        customerName: true,
        totalAmount: true,
        amount: true,
        paidAmount: true,
        createdAt: true,
      },
    });

    // Group by customerName and keep only the first (oldest) invoice for each hotel
    const hotelInvoiceMap = new Map<string, typeof allSentInvoices[0]>();
    allSentInvoices.forEach((invoice) => {
      const hotelName = invoice.customerName;
      if (!hotelInvoiceMap.has(hotelName)) {
        hotelInvoiceMap.set(hotelName, invoice);
      }
    });

    // Convert map values to array and sort by createdAt descending for display
    const sentInvoices = Array.from(hotelInvoiceMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({
      revenues,
      sentInvoices,
    });
  } catch (error) {
    console.error("Revenues fetch error:", error);
    return NextResponse.json(
      { error: "შემოსავლების ჩატვირთვისას მოხდა შეცდომა" },
      { status: 500 }
    );
  }
}

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
      select: { role: true },
    });

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "დაუშვებელია" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { source, description, amount, date } = body;

    const revenue = await prisma.revenue.create({
      data: {
        source,
        description,
        amount,
        date: new Date(date),
      },
    });

    return NextResponse.json(revenue, { status: 201 });
  } catch (error) {
    console.error("Revenue create error:", error);
    return NextResponse.json(
      { error: "შემოსავლის დამატებისას მოხდა შეცდომა" },
      { status: 500 }
    );
  }
}


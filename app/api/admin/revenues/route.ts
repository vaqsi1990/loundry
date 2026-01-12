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

    if (view === "all") {
      // Show all revenues - no filter
      revenueWhere = {};
    } else if (view === "daily" && date) {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        return NextResponse.json(
          { error: "არასწორი თარიღის ფორმატი" },
          { status: 400 }
        );
      }
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      revenueWhere.date = {
        gte: startOfDay,
        lte: endOfDay,
      };
    } else if (view === "monthly" && month) {
      const startOfMonth = new Date(`${month}-01`);
      if (isNaN(startOfMonth.getTime())) {
        return NextResponse.json(
          { error: "არასწორი თვის ფორმატი" },
          { status: 400 }
        );
      }
      const endOfMonth = new Date(startOfMonth);
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);
      endOfMonth.setDate(0);
      endOfMonth.setHours(23, 59, 59, 999);
      revenueWhere.date = {
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
    // Apply date filter only if view mode is set, otherwise show all sent invoices
    let invoiceDateFilter: any = {};
    if (view === "all") {
      // Show all invoices - no filter
      invoiceDateFilter = {};
    } else if (view === "daily" && date) {
      // Parse date string and create proper date range
      const dateObj = new Date(date + "T00:00:00");
      const startOfDay = new Date(dateObj);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(dateObj);
      endOfDay.setHours(23, 59, 59, 999);
      invoiceDateFilter.createdAt = {
        gte: startOfDay,
        lte: endOfDay,
      };
    } else if (view === "monthly" && month) {
      // Parse month string (YYYY-MM) and create proper date range
      const startOfMonth = new Date(`${month}-01T00:00:00`);
      const endOfMonth = new Date(startOfMonth);
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);
      endOfMonth.setDate(0); // Last day of the month
      endOfMonth.setHours(23, 59, 59, 999);
      invoiceDateFilter.createdAt = {
        gte: startOfMonth,
        lte: endOfMonth,
      };
    }

    // Build the invoice where clause
    // Show all invoices (not just those with customerEmail) since invoices can be sent in different ways
    const invoiceWhere: any = {
      ...invoiceDateFilter,
    };

    // Debug: Check total invoices from all tables (Admin, Legal, Physical)
    const [totalAdminInvoices, totalLegalInvoices, totalPhysicalInvoices] = await Promise.all([
      prisma.adminInvoice.count(),
      prisma.legalInvoice.count(),
      prisma.physicalInvoice.count(),
    ]);
    const totalInvoices = totalAdminInvoices + totalLegalInvoices + totalPhysicalInvoices;
    
    const [adminInvoicesInRange, legalInvoicesInRange, physicalInvoicesInRange] = await Promise.all([
      prisma.adminInvoice.count({ where: invoiceWhere }),
      prisma.legalInvoice.count({ where: invoiceWhere }),
      prisma.physicalInvoice.count({ where: invoiceWhere }),
    ]);
    const totalInvoicesInRange = adminInvoicesInRange + legalInvoicesInRange + physicalInvoicesInRange;
    
    console.log("Revenues API - Total invoices:", totalInvoices, "Total in date range:", totalInvoicesInRange);

    const [adminInvoices, legalInvoices, physicalInvoices] = await Promise.all([
      prisma.adminInvoice.findMany({
        where: invoiceWhere,
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          invoiceNumber: true,
          customerName: true,
          totalAmount: true,
          amount: true,
          totalWeightKg: true,
          protectorsAmount: true,
          paidAmount: true,
          status: true,
          createdAt: true,
          dueDate: true,
          customerEmail: true,
        },
      }),
      prisma.legalInvoice.findMany({
        where: invoiceWhere,
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          invoiceNumber: true,
          customerName: true,
          totalAmount: true,
          amount: true,
          totalWeightKg: true,
          protectorsAmount: true,
          paidAmount: true,
          status: true,
          createdAt: true,
          dueDate: true,
          customerEmail: true,
        },
      }),
      prisma.physicalInvoice.findMany({
        where: invoiceWhere,
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          invoiceNumber: true,
          customerName: true,
          totalAmount: true,
          amount: true,
          totalWeightKg: true,
          protectorsAmount: true,
          paidAmount: true,
          status: true,
          createdAt: true,
          dueDate: true,
          customerEmail: true,
        },
      }),
    ]);
    const allInvoices = [...adminInvoices, ...legalInvoices, ...physicalInvoices];

    // Show each invoice separately - no deduplication
    // Each invoice is unique by its ID, even if it has the same customerName, amount, weight, and protectors
    const sentInvoices = allInvoices;

    console.log("Revenues API - Found invoices after filter:", allInvoices.length, "View:", view, "Date:", date, "Month:", month);
    console.log("Revenues API - Invoice date filter:", JSON.stringify(invoiceDateFilter));
    if (sentInvoices.length > 0) {
      console.log("Revenues API - Sample invoice dates:", sentInvoices.slice(0, 3).map(inv => ({
        id: inv.id,
        createdAt: inv.createdAt,
        customerName: inv.customerName,
      })));
    }

    return NextResponse.json({
      revenues,
      sentInvoices,
    });
  } catch (error) {
    console.error("Revenues fetch error:", error);
    const errorMessage = error instanceof Error ? error.message : "უცნობი შეცდომა";
    return NextResponse.json(
      { error: `შემოსავლების ჩატვირთვისას მოხდა შეცდომა: ${errorMessage}` },
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


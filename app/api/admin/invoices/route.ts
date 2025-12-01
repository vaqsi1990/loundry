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

    const invoices = await prisma.invoice.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(invoices);
  } catch (error) {
    console.error("Invoices fetch error:", error);
    return NextResponse.json(
      { error: "ინვოისების ჩატვირთვისას მოხდა შეცდომა" },
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
    const { invoiceNumber, customerName, customerEmail, amount, status, dueDate } = body;

    // Check if invoice number already exists
    const existing = await prisma.invoice.findUnique({
      where: { invoiceNumber },
    });

    if (existing) {
      return NextResponse.json(
        { error: "ინვოისის ნომერი უკვე არსებობს" },
        { status: 400 }
      );
    }

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        customerName,
        customerEmail: customerEmail || null,
        amount,
        status,
        dueDate: new Date(dueDate),
      },
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error("Invoice create error:", error);
    return NextResponse.json(
      { error: "ინვოისის დამატებისას მოხდა შეცდომა" },
      { status: 500 }
    );
  }
}


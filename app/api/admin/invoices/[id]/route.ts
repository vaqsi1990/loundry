import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    if (!user || (user.role !== "ADMIN" && user.role !== "MANAGER" && user.role !== "MANAGER_ASSISTANT")) {
      return NextResponse.json(
        { error: "დაუშვებელია" },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Try to find invoice in both tables
    const [legalInvoice, physicalInvoice] = await Promise.all([
      prisma.legalInvoice.findUnique({ where: { id } }),
      prisma.physicalInvoice.findUnique({ where: { id } }),
    ]);

    const invoice = legalInvoice || physicalInvoice;

    if (!invoice) {
      return NextResponse.json({ error: "ინვოისი არ მოიძებნა" }, { status: 404 });
    }

    return NextResponse.json(invoice);
  } catch (error) {
    console.error("Invoice fetch error:", error);
    return NextResponse.json(
      { error: "ინვოისის მიღებისას მოხდა შეცდომა" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    if (!user || (user.role !== "ADMIN" && user.role !== "MANAGER" && user.role !== "MANAGER_ASSISTANT")) {
      return NextResponse.json(
        { error: "დაუშვებელია" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { status, paidAmount } = body;

    const updateData: any = {};
    
    if (status !== undefined) {
      if (!["PENDING", "PAID", "CANCELLED"].includes(status)) {
        return NextResponse.json(
          { error: "არასწორი სტატუსი" },
          { status: 400 }
        );
      }
      updateData.status = status;
    }

    if (paidAmount !== undefined) {
      const paid = parseFloat(paidAmount);
      if (isNaN(paid) || paid < 0) {
        return NextResponse.json(
          { error: "არასწორი ჩარიცხვის თანხა" },
          { status: 400 }
        );
      }
      updateData.paidAmount = paid;
    }

    const invoice = await prisma.invoice.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(invoice);
  } catch (error) {
    console.error("Invoice update error:", error);
    return NextResponse.json(
      { error: "ინვოისის განახლებისას მოხდა შეცდომა" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    if (!user || (user.role !== "ADMIN" && user.role !== "MANAGER" && user.role !== "MANAGER_ASSISTANT")) {
      return NextResponse.json(
        { error: "დაუშვებელია" },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Check if invoice exists in either table
    const [legalInvoice, physicalInvoice] = await Promise.all([
      prisma.legalInvoice.findUnique({ where: { id } }),
      prisma.physicalInvoice.findUnique({ where: { id } }),
    ]);

    if (!legalInvoice && !physicalInvoice) {
      return NextResponse.json(
        { error: "ინვოისი არ მოიძებნა" },
        { status: 404 }
      );
    }

    // Delete from the appropriate table
    if (legalInvoice) {
      await prisma.legalInvoice.delete({ where: { id } });
    } else {
      await prisma.physicalInvoice.delete({ where: { id } });
    }

    return NextResponse.json({ message: "ინვოისი წაიშალა" });
  } catch (error) {
    console.error("Invoice delete error:", error);
    const errorMessage = error instanceof Error ? error.message : "უცნობი შეცდომა";
    
    // Check for Prisma foreign key constraint errors
    if (errorMessage.includes("Foreign key constraint") || errorMessage.includes("P2003")) {
      return NextResponse.json(
        { error: "ინვოისის წაშლა ვერ მოხერხდა, რადგან ის დაკავშირებულია სხვა ჩანაწერებთან" },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: `ინვოისის წაშლისას მოხდა შეცდომა: ${errorMessage}` },
      { status: 500 }
    );
  }
}


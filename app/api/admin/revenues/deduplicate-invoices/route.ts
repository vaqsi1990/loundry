import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  planDuplicateInvoiceRemovals,
  prismaInvoiceDedupeSelect,
  type RevenueInvoiceDedupeRow,
} from "@/lib/revenue-invoice-dedupe";

function serializePlan(table: string, plans: ReturnType<typeof planDuplicateInvoiceRemovals>) {
  return plans.map((p) => ({
    table,
    fingerprint: p.fingerprint,
    kept: {
      id: p.kept.id,
      invoiceNumber: p.kept.invoiceNumber,
      customerName: p.kept.customerName,
      totalAmount: p.kept.totalAmount,
      amount: p.kept.amount,
      paidAmount: p.kept.paidAmount,
      status: p.kept.status,
      createdAt: p.kept.createdAt,
      dueDate: p.kept.dueDate,
    },
    removed: p.removed.map((r) => ({
      id: r.id,
      invoiceNumber: r.invoiceNumber,
      customerName: r.customerName,
      totalAmount: r.totalAmount,
      amount: r.amount,
      paidAmount: r.paidAmount,
      status: r.status,
      createdAt: r.createdAt,
      dueDate: r.dueDate,
    })),
  }));
}

/**
 * POST { dryRun?: boolean }
 * იპოვნის ინვოისების დუბლიკატებს (იგივე ლოგიკა რაც შემოსავლების სიაში გაერთიანება)
 * და წაშლის ზედმეტებს — რჩება უმაღლესი გადახდით / უახლესი ჩანაწერი.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "არ არის ავტორიზებული" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || (user.role !== "ADMIN" && user.role !== "MANAGER" && user.role !== "MANAGER_ASSISTANT")) {
      return NextResponse.json({ error: "დაუშვებელია" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const dryRun = body.dryRun === true;

    const [adminRows, legalRows, physicalRows] = await Promise.all([
      prisma.adminInvoice.findMany({ select: prismaInvoiceDedupeSelect }),
      prisma.legalInvoice.findMany({ select: prismaInvoiceDedupeSelect }),
      prisma.physicalInvoice.findMany({ select: prismaInvoiceDedupeSelect }),
    ]);

    const adminPlans = planDuplicateInvoiceRemovals(adminRows as RevenueInvoiceDedupeRow[]);
    const legalPlans = planDuplicateInvoiceRemovals(legalRows as RevenueInvoiceDedupeRow[]);
    const physicalPlans = planDuplicateInvoiceRemovals(physicalRows as RevenueInvoiceDedupeRow[]);

    const adminIds = adminPlans.flatMap((p) => p.removed.map((r) => r.id));
    const legalIds = legalPlans.flatMap((p) => p.removed.map((r) => r.id));
    const physicalIds = physicalPlans.flatMap((p) => p.removed.map((r) => r.id));

    if (!dryRun) {
      if (adminIds.length) {
        await prisma.adminInvoice.deleteMany({ where: { id: { in: adminIds } } });
      }
      if (legalIds.length) {
        await prisma.legalInvoice.deleteMany({ where: { id: { in: legalIds } } });
      }
      if (physicalIds.length) {
        await prisma.physicalInvoice.deleteMany({ where: { id: { in: physicalIds } } });
      }
    }

    const totalRemoved = adminIds.length + legalIds.length + physicalIds.length;
    const groupCount = adminPlans.length + legalPlans.length + physicalPlans.length;

    return NextResponse.json({
      dryRun,
      totalRemoved,
      groupCount,
      admin: {
        removedCount: adminIds.length,
        groups: serializePlan("admin", adminPlans),
      },
      legal: {
        removedCount: legalIds.length,
        groups: serializePlan("legal", legalPlans),
      },
      physical: {
        removedCount: physicalIds.length,
        groups: serializePlan("physical", physicalPlans),
      },
    });
  } catch (error) {
    console.error("deduplicate-invoices error:", error);
    const message = error instanceof Error ? error.message : "უცნობი შეცდომა";
    return NextResponse.json(
      { error: `დუბლიკატების დამუშავებისას მოხდა შეცდომა: ${message}` },
      { status: 500 }
    );
  }
}

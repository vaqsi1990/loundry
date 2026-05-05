import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

type UpdateBody = {
  pricePerKg?: number | string | null;
  totalWeight?: number | string | null;
  totalPrice?: number | string | null;
  heavyWeight?: number | string | null;
  heavyPricePerKg?: number | string | null;
  totalAmount?: number | string | null;
};

function toOptionalFloat(v: unknown): number | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
  if (!Number.isFinite(n)) return undefined;
  return n;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    const legal = await prisma.legalDailySheetEmailSend.findUnique({
      where: { id },
      include: { dailySheet: true },
    });
    if (legal?.dailySheet) {
      return NextResponse.json({
        kind: "LEGAL",
        emailSendId: id,
        dailySheetId: legal.dailySheetId,
        invoicePdfSentAt: legal.invoicePdfSentAt,
        invoicePdfSentTo: legal.invoicePdfSentTo,
        overrides: {
          totalAmount: legal.totalAmount,
        },
        dailySheet: {
          sheetType: legal.dailySheet.sheetType,
          pricePerKg: legal.dailySheet.pricePerKg,
          totalWeight: legal.dailySheet.totalWeight,
          totalPrice: legal.dailySheet.totalPrice,
          heavyWeight: legal.dailySheet.heavyWeight,
          heavyPricePerKg: legal.dailySheet.heavyPricePerKg,
        },
      });
    }

    const physical = await prisma.physicalDailySheetEmailSend.findUnique({
      where: { id },
      include: { dailySheet: true },
    });
    if (physical?.dailySheet) {
      return NextResponse.json({
        kind: "PHYSICAL",
        emailSendId: id,
        dailySheetId: physical.dailySheetId,
        invoicePdfSentAt: physical.invoicePdfSentAt,
        invoicePdfSentTo: physical.invoicePdfSentTo,
        overrides: {
          totalAmount: physical.totalAmount,
        },
        dailySheet: {
          sheetType: physical.dailySheet.sheetType,
          pricePerKg: physical.dailySheet.pricePerKg,
          totalWeight: physical.dailySheet.totalWeight,
          totalPrice: physical.dailySheet.totalPrice,
          heavyWeight: physical.dailySheet.heavyWeight,
          heavyPricePerKg: physical.dailySheet.heavyPricePerKg,
        },
      });
    }

    return NextResponse.json({ error: "ინვოისი არ მოიძებნა" }, { status: 404 });
  } catch (error) {
    console.error("Invoice emailSend fetch error:", error);
    return NextResponse.json({ error: "შეცდომა" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const body = (await request.json()) as UpdateBody;

    const sheetUpdateData: Record<string, number | null> = {};
    const sendUpdateData: Record<string, number | null> = {};
    const fields: Array<keyof UpdateBody> = [
      "pricePerKg",
      "totalWeight",
      "totalPrice",
      "heavyWeight",
      "heavyPricePerKg",
    ];

    for (const f of fields) {
      const val = toOptionalFloat(body[f]);
      if (val !== undefined) {
        if (val !== null && val < 0) {
          return NextResponse.json({ error: "არასწორი მნიშვნელობა" }, { status: 400 });
        }
        sheetUpdateData[f] = val;
      }
    }

    const totalAmountVal = toOptionalFloat(body.totalAmount);
    if (totalAmountVal !== undefined) {
      if (totalAmountVal !== null && totalAmountVal < 0) {
        return NextResponse.json({ error: "არასწორი მნიშვნელობა" }, { status: 400 });
      }
      sendUpdateData.totalAmount = totalAmountVal;
    }

    if (Object.keys(sheetUpdateData).length === 0 && Object.keys(sendUpdateData).length === 0) {
      return NextResponse.json({ error: "არაფერი შეცვლილა" }, { status: 400 });
    }

    const legal = await prisma.legalDailySheetEmailSend.findUnique({
      where: { id },
      select: { dailySheetId: true },
    });
    if (legal?.dailySheetId) {
      const [updatedSheet, updatedSend] = await Promise.all([
        Object.keys(sheetUpdateData).length > 0
          ? prisma.legalDailySheet.update({
              where: { id: legal.dailySheetId },
              data: sheetUpdateData,
            })
          : prisma.legalDailySheet.findUnique({ where: { id: legal.dailySheetId } }),
        Object.keys(sendUpdateData).length > 0
          ? prisma.legalDailySheetEmailSend.update({
              where: { id },
              data: sendUpdateData,
            })
          : prisma.legalDailySheetEmailSend.findUnique({ where: { id } }),
      ]);
      return NextResponse.json({
        ok: true,
        kind: "LEGAL",
        dailySheet: updatedSheet,
        overrides: { totalAmount: (updatedSend as any)?.totalAmount ?? null },
      });
    }

    const physical = await prisma.physicalDailySheetEmailSend.findUnique({
      where: { id },
      select: { dailySheetId: true },
    });
    if (physical?.dailySheetId) {
      const [updatedSheet, updatedSend] = await Promise.all([
        Object.keys(sheetUpdateData).length > 0
          ? prisma.physicalDailySheet.update({
              where: { id: physical.dailySheetId },
              data: sheetUpdateData,
            })
          : prisma.physicalDailySheet.findUnique({ where: { id: physical.dailySheetId } }),
        Object.keys(sendUpdateData).length > 0
          ? prisma.physicalDailySheetEmailSend.update({
              where: { id },
              data: sendUpdateData,
            })
          : prisma.physicalDailySheetEmailSend.findUnique({ where: { id } }),
      ]);
      return NextResponse.json({
        ok: true,
        kind: "PHYSICAL",
        dailySheet: updatedSheet,
        overrides: { totalAmount: (updatedSend as any)?.totalAmount ?? null },
      });
    }

    return NextResponse.json({ error: "ინვოისი არ მოიძებნა" }, { status: 404 });
  } catch (error) {
    console.error("Invoice emailSend update error:", error);
    return NextResponse.json({ error: "შეცდომა" }, { status: 500 });
  }
}


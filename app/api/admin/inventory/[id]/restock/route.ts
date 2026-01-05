import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(
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
    const { quantity } = body;

    const item = await prisma.inventory.findUnique({
      where: { id },
    });

    if (!item) {
      return NextResponse.json(
        { error: "პროდუქტი არ მოიძებნა" },
        { status: 404 }
      );
    }

    const restockDate = new Date();

    const updatedItem = await prisma.inventory.update({
      where: { id },
      data: {
        quantity: item.quantity + quantity,
        lastRestocked: restockDate,
        movements: {
          create: {
            type: "RECEIPT",
            quantity: quantity,
            date: restockDate,
            notes: "რესტოკი",
          },
        },
      },
      include: {
        movements: {
          orderBy: {
            date: "desc",
          },
        },
      },
    });

    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error("Inventory restock error:", error);
    return NextResponse.json(
      { error: "რესტოკისას მოხდა შეცდომა" },
      { status: 500 }
    );
  }
}


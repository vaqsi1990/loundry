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

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "დაუშვებელია" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { quantity, notes, date } = body;

    if (!quantity || quantity <= 0) {
      return NextResponse.json(
        { error: "რაოდენობა უნდა იყოს დადებითი რიცხვი" },
        { status: 400 }
      );
    }

    const item = await prisma.inventory.findUnique({
      where: { id },
    });

    if (!item) {
      return NextResponse.json(
        { error: "პროდუქტი არ მოიძებნა" },
        { status: 404 }
      );
    }

    if (item.quantity < quantity) {
      return NextResponse.json(
        { error: "არასაკმარისი რაოდენობა საწყობში" },
        { status: 400 }
      );
    }

    // Update inventory quantity
    const updatedItem = await prisma.inventory.update({
      where: { id },
      data: {
        quantity: item.quantity - quantity,
      },
    });

    // Create removal movement record
    await prisma.inventoryMovement.create({
      data: {
        inventoryId: id,
        type: "REMOVAL",
        quantity: quantity,
        date: date ? new Date(date) : new Date(),
        notes: notes || null,
      },
    });

    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error("Inventory removal error:", error);
    return NextResponse.json(
      { error: "გატანისას მოხდა შეცდომა" },
      { status: 500 }
    );
  }
}


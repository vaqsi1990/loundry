import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function PUT(
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
    const { itemName, category, quantity, unit, unitPrice, supplier } = body;

    const item = await prisma.inventory.update({
      where: { id },
      data: {
        itemName,
        category: category || null,
        quantity,
        unit,
        unitPrice: unitPrice || null,
        supplier: supplier || null,
      },
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error("Inventory update error:", error);
    return NextResponse.json(
      { error: "პროდუქტის განახლებისას მოხდა შეცდომა" },
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

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "დაუშვებელია" },
        { status: 403 }
      );
    }

    const { id } = await params;

    await prisma.inventory.delete({
      where: { id },
    });

    return NextResponse.json({ message: "პროდუქტი წაიშალა" });
  } catch (error) {
    console.error("Inventory delete error:", error);
    return NextResponse.json(
      { error: "პროდუქტის წაშლისას მოხდა შეცდომა" },
      { status: 500 }
    );
  }
}


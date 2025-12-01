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

    const items = await prisma.inventory.findMany({
      orderBy: {
        itemName: "asc",
      },
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error("Inventory fetch error:", error);
    return NextResponse.json(
      { error: "საწყობის ჩატვირთვისას მოხდა შეცდომა" },
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
    const { itemName, category, quantity, unit, unitPrice, supplier } = body;

    const item = await prisma.inventory.create({
      data: {
        itemName,
        category: category || null,
        quantity,
        unit,
        unitPrice: unitPrice || null,
        supplier: supplier || null,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("Inventory create error:", error);
    return NextResponse.json(
      { error: "პროდუქტის დამატებისას მოხდა შეცდომა" },
      { status: 500 }
    );
  }
}


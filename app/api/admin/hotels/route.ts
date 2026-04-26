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

    if (!user || (user.role !== "ADMIN" && user.role !== "MANAGER" && user.role !== "MANAGER_ASSISTANT")) {
      return NextResponse.json(
        { error: "დაუშვებელია" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const pageParam = searchParams.get("page");
    const limitParam = searchParams.get("limit");
    const qParam = searchParams.get("q");

    const page = Math.max(1, Number(pageParam ?? "1") || 1);
    const pageSize = Math.min(50, Math.max(1, Number(limitParam ?? "10") || 10));
    const skip = (page - 1) * pageSize;
    const q = (qParam ?? "").trim();

    const where =
      q.length > 0
        ? {
            OR: [
              { hotelName: { contains: q, mode: "insensitive" as const } },
              { email: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : undefined;

    const [total, items] = await Promise.all([
      prisma.hotelDatabase.count({ where }),
      prisma.hotelDatabase.findMany({
        where,
        orderBy: { hotelName: "asc" },
        skip,
        take: pageSize,
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return NextResponse.json({
      items,
      total,
      page,
      pageSize,
      totalPages,
    });
  } catch (error) {
    console.error("Hotels fetch error:", error);
    return NextResponse.json(
      { error: "სასტუმროების ჩატვირთვისას მოხდა შეცდომა" },
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

    if (!user || (user.role !== "ADMIN" && user.role !== "MANAGER" && user.role !== "MANAGER_ASSISTANT")) {
      return NextResponse.json(
        { error: "დაუშვებელია" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { hotelName, contactPhone, email, address, notes } = body;

    const hotel = await prisma.hotelDatabase.create({
      data: {
        hotelName,
        contactPhone,
        email: email || null,
        address: address || null,
        notes: notes || null,
      },
    });

    return NextResponse.json(hotel, { status: 201 });
  } catch (error) {
    console.error("Hotel create error:", error);
    return NextResponse.json(
      { error: "სასტუმროს დამატებისას მოხდა შეცდომა" },
      { status: 500 }
    );
  }
}


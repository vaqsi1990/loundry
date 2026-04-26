import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

const ADMIN_ROLES = new Set(["ADMIN", "MANAGER", "MANAGER_ASSISTANT"] as const);

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
    if (!user || !ADMIN_ROLES.has(user.role as any)) {
      return NextResponse.json({ error: "დაუშვებელია" }, { status: 403 });
    }

    const body = await request.json();
    const hotelId = body?.hotelId as string | undefined;
    if (!hotelId) {
      return NextResponse.json({ error: "hotelId აუცილებელია" }, { status: 400 });
    }

    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId },
      select: { id: true },
    });
    if (!hotel) {
      return NextResponse.json({ error: "სასტუმრო არ მოიძებნა" }, { status: 404 });
    }

    const thread =
      (await prisma.hotelConversation.findUnique({ where: { hotelId } })) ??
      (await prisma.hotelConversation.create({ data: { hotelId } }));

    return NextResponse.json({ threadId: thread.id }, { status: 201 });
  } catch (error) {
    console.error("Ensure thread error:", error);
    return NextResponse.json({ error: "ჩატის შექმნისას მოხდა შეცდომა" }, { status: 500 });
  }
}


import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// Get pickup/delivery requests for physical person hotel
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
      include: {
        hotels: {
          where: { type: "PHYSICAL" },
        },
      },
    });

    if (!user || !user.hotels || user.hotels.length === 0) {
      return NextResponse.json(
        { error: "ფიზიკური პირის სასტუმრო არ მოიძებნა" },
        { status: 404 }
      );
    }

    const hotel = user.hotels[0];

    const requests = await (prisma as any).pickupDeliveryRequest.findMany({
      where: {
        hotelId: hotel.id,
        userId: session.user.id,
      },
      orderBy: {
        requestedAt: "desc",
      },
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error("Pickup/delivery requests fetch error:", error);
    return NextResponse.json(
      { error: "მოთხოვნების ჩატვირთვისას მოხდა შეცდომა" },
      { status: 500 }
    );
  }
}

// Create pickup/delivery request
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "არ არის ავტორიზებული" },
        { status: 401 }
      );
    }

    const body: any = await request.json();
    const { requestType, notes } = body;

    if (!requestType || !["PICKUP", "DELIVERY", "BOTH"].includes(requestType)) {
      return NextResponse.json(
        { error: "მოთხოვნის ტიპი აუცილებელია (PICKUP, DELIVERY, ან BOTH)" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        hotels: {
          where: { type: "PHYSICAL" },
        },
      },
    });

    if (!user || !user.hotels || user.hotels.length === 0) {
      return NextResponse.json(
        { error: "ფიზიკური პირის სასტუმრო არ მოიძებნა" },
        { status: 404 }
      );
    }

    const hotel = user.hotels[0];

    const pickupRequest = await (prisma as any).pickupDeliveryRequest.create({
      data: {
        hotelId: hotel.id,
        userId: session.user.id,
        requestType,
        notes: notes || null,
        status: "PENDING",
      },
    });

    return NextResponse.json(
      { message: "მოთხოვნა წარმატებით შეიქმნა", request: pickupRequest },
      { status: 201 }
    );
  } catch (error) {
    console.error("Pickup/delivery request creation error:", error);
    return NextResponse.json(
      { error: "მოთხოვნის შექმნისას მოხდა შეცდომა" },
      { status: 500 }
    );
  }
}


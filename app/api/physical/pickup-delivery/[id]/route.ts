import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// Update pickup/delivery request
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
    const { id } = await params;

    // Check if request exists and belongs to user
    const existingRequest = await prisma.physicalPickupDeliveryRequest.findUnique({
      where: { id },
    });

    if (!existingRequest) {
      return NextResponse.json(
        { error: "მოთხოვნა არ მოიძებნა" },
        { status: 404 }
      );
    }

    if (existingRequest.hotelId !== hotel.id || existingRequest.userId !== session.user.id) {
      return NextResponse.json(
        { error: "არ გაქვთ ამ მოთხოვნის რედაქტირების უფლება" },
        { status: 403 }
      );
    }

    // Only allow editing if status is PENDING
    if (existingRequest.status !== "PENDING") {
      return NextResponse.json(
        { error: "მხოლოდ მოლოდინში მყოფი მოთხოვნების რედაქტირება შეიძლება" },
        { status: 400 }
      );
    }

    const updatedRequest = await prisma.physicalPickupDeliveryRequest.update({
      where: { id },
      data: {
        requestType,
        notes: notes || null,
      },
    });

    return NextResponse.json(
      { message: "მოთხოვნა წარმატებით განახლდა", request: updatedRequest },
      { status: 200 }
    );
  } catch (error) {
    console.error("Pickup/delivery request update error:", error);
    return NextResponse.json(
      { error: "მოთხოვნის განახლებისას მოხდა შეცდომა" },
      { status: 500 }
    );
  }
}

// Delete pickup/delivery request
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
    const { id } = await params;

    // Check if request exists and belongs to user
    const existingRequest = await prisma.physicalPickupDeliveryRequest.findUnique({
      where: { id },
    });

    if (!existingRequest) {
      return NextResponse.json(
        { error: "მოთხოვნა არ მოიძებნა" },
        { status: 404 }
      );
    }

    if (existingRequest.hotelId !== hotel.id || existingRequest.userId !== session.user.id) {
      return NextResponse.json(
        { error: "არ გაქვთ ამ მოთხოვნის წაშლის უფლება" },
        { status: 403 }
      );
    }

    await prisma.physicalPickupDeliveryRequest.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: "მოთხოვნა წარმატებით წაიშალა" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Pickup/delivery request deletion error:", error);
    return NextResponse.json(
      { error: "მოთხოვნის წაშლისას მოხდა შეცდომა" },
      { status: 500 }
    );
  }
}

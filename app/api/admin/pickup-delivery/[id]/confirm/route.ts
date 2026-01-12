import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// Confirm pickup/delivery request (admin)
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
    });

    if (!user) {
      return NextResponse.json(
        { error: "მომხმარებელი არ მოიძებნა" },
        { status: 404 }
      );
    }

    const userRole = (user as any).role;
    if (userRole !== "ADMIN") {
      return NextResponse.json(
        { error: "არ გაქვთ ნებართვა" },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Check if request exists in either table
    const [legalRequest, physicalRequest] = await Promise.all([
      prisma.legalPickupDeliveryRequest.findUnique({ where: { id } }),
      prisma.physicalPickupDeliveryRequest.findUnique({ where: { id } }),
    ]);

    const existingRequest = legalRequest || physicalRequest;

    if (!existingRequest) {
      return NextResponse.json(
        { error: "მოთხოვნა არ მოიძებნა" },
        { status: 404 }
      );
    }

    // Check if already confirmed
    if (existingRequest.status === "CONFIRMED" || existingRequest.status === "COMPLETED") {
      return NextResponse.json(
        { error: "მოთხოვნა უკვე დადასტურებულია" },
        { status: 400 }
      );
    }

    // Update status to CONFIRMED in the appropriate table
    const updatedRequest = legalRequest
      ? await prisma.legalPickupDeliveryRequest.update({
          where: { id },
          data: {
            status: "CONFIRMED",
            confirmedAt: new Date(),
          },
        })
      : await prisma.physicalPickupDeliveryRequest.update({
          where: { id },
          data: {
            status: "CONFIRMED",
            confirmedAt: new Date(),
          },
        });

    return NextResponse.json(
      { message: "მოთხოვნა წარმატებით დაადასტურა", request: updatedRequest },
      { status: 200 }
    );
  } catch (error) {
    console.error("Pickup/delivery request confirmation error:", error);
    return NextResponse.json(
      { error: "მოთხოვნის დადასტურებისას მოხდა შეცდომა" },
      { status: 500 }
    );
  }
}

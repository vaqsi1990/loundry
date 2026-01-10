import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// Get all pickup/delivery requests for manager
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
    });

    if (!user) {
      return NextResponse.json(
        { error: "მომხმარებელი არ მოიძებნა" },
        { status: 404 }
      );
    }

    const userRole = (user as any).role;
    if (userRole !== "MANAGER" && userRole !== "MANAGER_ASSISTANT") {
      return NextResponse.json(
        { error: "არ გაქვთ ნებართვა" },
        { status: 403 }
      );
    }

    const requests = await (prisma as any).pickupDeliveryRequest.findMany({
      where: {
        OR: [
          { hiddenFromManager: false },
          { hiddenFromManager: null },
        ],
      },
      include: {
        hotel: {
          select: {
            id: true,
            hotelName: true,
            type: true,
            email: true,
            mobileNumber: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            mobileNumber: true,
          },
        },
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

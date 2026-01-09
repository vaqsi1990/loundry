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
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        mobileNumber: true,
        createdAt: true,
        hotels: {
          where: {
            type: "PHYSICAL",
          },
          select: {
            id: true,
            hotelName: true,
            hotelRegistrationNumber: true,
            numberOfRooms: true,
            email: true,
            mobileNumber: true,
            pricePerKg: true,
            companyName: true,
            address: true,
            firstName: true,
            lastName: true,
            personalId: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "მომხმარებელი არ მოიძებნა" },
        { status: 404 }
      );
    }

    console.log("Physical profile API - User ID:", session.user.id);
    console.log("Physical profile API - User:", {
      id: user.id,
      email: user.email,
      name: user.name,
    });
    console.log("Physical profile API - Hotels count:", user.hotels?.length || 0);
    console.log("Physical profile API - Hotels:", JSON.stringify(user.hotels, null, 2));
    console.log("Physical profile API - Hotels type:", typeof user.hotels);
    console.log("Physical profile API - Hotels is array:", Array.isArray(user.hotels));

    // Ensure hotels is always an array
    const responseData = {
      ...user,
      hotels: Array.isArray(user.hotels) ? user.hotels : (user.hotels ? [user.hotels] : []),
    };

    console.log("Physical profile API - Response data:", {
      ...responseData,
      hotels: responseData.hotels,
      hotelsCount: responseData.hotels.length,
    });

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Physical profile fetch error:", error);
    return NextResponse.json(
      { error: "პროფილის ჩატვირთვისას მოხდა შეცდომა" },
      { status: 500 }
    );
  }
}


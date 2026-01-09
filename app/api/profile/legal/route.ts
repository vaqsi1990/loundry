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
            type: "LEGAL",
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
            legalEntityName: true,
            identificationCode: true,
            responsiblePersonName: true,
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

    return NextResponse.json(user);
  } catch (error) {
    console.error("Legal profile fetch error:", error);
    return NextResponse.json(
      { error: "პროფილის ჩატვირთვისას მოხდა შეცდომა" },
      { status: 500 }
    );
  }
}


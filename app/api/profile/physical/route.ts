import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { shouldUpdateUserLoginEmail } from "@/lib/profile-email-update";
import { renameDailySheetHotelNames } from "@/lib/hotel-daily-sheet-ownership";

const updatePhysicalHotelSchema = z.object({
  hotelName: z.string().min(1, "სასტუმროს დასახელება სავალდებულოა").optional(),
  hotelRegistrationNumber: z.string().optional(),
  numberOfRooms: z.number().int().positive("ნომრების რაოდენობა უნდა იყოს დადებითი რიცხვი").optional(),
  email: z.string().email("გთხოვთ შეიყვანოთ სწორი ელფოსტა").optional(),
  mobileNumber: z.string().min(1, "მობილურის ნომერი სავალდებულოა").optional(),
  pricePerKg: z.number().positive("კილოგრამის ფასი უნდა იყოს დადებითი რიცხვი").optional(),
  hasDgg: z.boolean().optional(),
  companyName: z.string().optional(),
  address: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  personalId: z.string().optional(),
  password: z
    .string()
    .optional()
    .refine((val) => !val || val.length >= 6, {
      message: "პაროლი უნდა შედგებოდეს მინიმუმ 6 სიმბოლოსგან",
    }),
});

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
            hasDgg: true,
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

export async function PUT(request: NextRequest) {
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
    const body = await request.json();
    const validatedData = updatePhysicalHotelSchema.parse(body);

    const userUpdates: Record<string, unknown> = {};
    if (
      shouldUpdateUserLoginEmail(
        validatedData.email,
        user.email,
        hotel.email
      )
    ) {
      const incomingEmail = validatedData.email!.trim();
      const existingUser = await prisma.user.findFirst({
        where: {
          email: { equals: incomingEmail, mode: "insensitive" },
          id: { not: session.user.id },
        },
        select: { id: true },
      });
      if (existingUser) {
        return NextResponse.json(
          { error: "ეს ელფოსტა უკვე გამოყენებულია" },
          { status: 400 }
        );
      }
      userUpdates.email = incomingEmail;
    }
    if (validatedData.mobileNumber) {
      userUpdates.mobileNumber = validatedData.mobileNumber;
    }
    if (validatedData.password?.trim()) {
      userUpdates.password = await bcrypt.hash(validatedData.password.trim(), 10);
      userUpdates.mustChangePassword = false;
      userUpdates.passwordChangedAt = new Date();
    }
    if (validatedData.firstName || validatedData.lastName) {
      const currentName = user.name || "";
      const currentParts = currentName.split(" ");
      const firstName = validatedData.firstName || currentParts[0] || "";
      const lastName = validatedData.lastName || currentParts.slice(1).join(" ") || "";
      userUpdates.name = `${firstName} ${lastName}`.trim();
    }

    if (Object.keys(userUpdates).length > 0) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: userUpdates,
      });
    }

    const newHotelName = validatedData.hotelName?.trim();
    if (newHotelName && newHotelName !== hotel.hotelName) {
      await renameDailySheetHotelNames(
        "physical",
        hotel.hotelName,
        newHotelName,
        hotel,
        user
      );
    }

    // Update hotel
    const hotelUpdates: Record<string, unknown> = {};
    if (newHotelName) hotelUpdates.hotelName = newHotelName;
    if (validatedData.hotelRegistrationNumber) hotelUpdates.hotelRegistrationNumber = validatedData.hotelRegistrationNumber.trim();
    if (validatedData.numberOfRooms !== undefined) hotelUpdates.numberOfRooms = validatedData.numberOfRooms;
    if (validatedData.email) hotelUpdates.email = validatedData.email.trim();
    if (validatedData.mobileNumber) hotelUpdates.mobileNumber = validatedData.mobileNumber.trim();
    if (validatedData.pricePerKg !== undefined) hotelUpdates.pricePerKg = validatedData.pricePerKg;
    if (validatedData.hasDgg !== undefined) hotelUpdates.hasDgg = validatedData.hasDgg;
    if (validatedData.companyName !== undefined) hotelUpdates.companyName = validatedData.companyName?.trim() || null;
    if (validatedData.address !== undefined) hotelUpdates.address = validatedData.address?.trim() || null;
    if (validatedData.firstName !== undefined) hotelUpdates.firstName = validatedData.firstName?.trim() || null;
    if (validatedData.lastName !== undefined) hotelUpdates.lastName = validatedData.lastName?.trim() || null;
    if (validatedData.personalId !== undefined) hotelUpdates.personalId = validatedData.personalId?.trim() || null;

    if (Object.keys(hotelUpdates).length > 0) {
      await prisma.hotel.update({
        where: { id: hotel.id },
        data: hotelUpdates,
      });
    }

    return NextResponse.json({ message: "პროფილი წარმატებით განახლდა" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Physical profile update error:", error);
    return NextResponse.json(
      { error: "პროფილის განახლებისას მოხდა შეცდომა" },
      { status: 500 }
    );
  }
}


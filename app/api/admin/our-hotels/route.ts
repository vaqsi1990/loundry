import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const hotelSchema = z.object({
  hotelType: z.enum(["PHYSICAL", "LEGAL"]),
  hotelName: z.string().min(1, "სასტუმროს დასახელება სავალდებულოა"),
  hotelRegistrationNumber: z.string().min(1, "რეგისტრაციის ნომერი სავალდებულოა"),
  numberOfRooms: z.number().int().positive("ნომრების რაოდენობა უნდა იყოს დადებითი რიცხვი"),
  hotelEmail: z.string().email("გთხოვთ შეიყვანოთ სწორი ელფოსტა"),
  mobileNumber: z.string().min(1, "მობილურის ნომერი სავალდებულოა"),
  // User account fields
  name: z.string().min(1, "სახელი სავალდებულოა"),
  lastName: z.string().min(1, "გვარი სავალდებულოა"),
  email: z.string().email("გთხოვთ შეიყვანოთ სწორი ელფოსტა"),
  password: z.string().min(6, "პაროლი უნდა შედგებოდეს მინიმუმ 6 სიმბოლოსგან"),
  // Optional fields
  personalId: z.string().optional(),
  legalEntityName: z.string().optional(),
  identificationCode: z.string().optional(),
  responsiblePersonName: z.string().optional(),
}).refine((data) => {
  if (data.hotelType === "PHYSICAL" && !data.personalId) {
    return false;
  }
  return true;
}, {
  message: "პირადი ნომერი სავალდებულოა ფიზიკური პირისთვის",
  path: ["personalId"],
}).refine((data) => {
  if (data.hotelType === "LEGAL") {
    return data.legalEntityName && data.identificationCode && data.responsiblePersonName;
  }
  return true;
}, {
  message: "იურიდიული პირისთვის სავალდებულოა: იურიდიული/შპს დასახელება, საიდენტიფიკაციო კოდი და პასუხისმგებელი პირი",
  path: ["legalEntityName"],
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
      select: { role: true },
    });

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "დაუშვებელია" },
        { status: 403 }
      );
    }

    // Get all hotels that are registered (have userId)
    const hotels = await prisma.hotel.findMany({
      where: {
        userId: {
          not: null,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(hotels);
  } catch (error) {
    console.error("Our hotels fetch error:", error);
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

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "დაუშვებელია" },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    // Validate the data
    const validatedData = hotelSchema.parse(body);

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "ეს ელფოსტა უკვე გამოყენებულია" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 10);

    // Create user and hotel in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const newUser = await tx.user.create({
        data: {
          name: `${validatedData.name} ${validatedData.lastName}`.trim(),
          email: validatedData.email,
          password: hashedPassword,
          mobileNumber: validatedData.mobileNumber,
          role: "USER",
        },
      });

      // Create hotel
      const hotelData: any = {
        type: validatedData.hotelType,
        userId: newUser.id,
        hotelName: validatedData.hotelName,
        hotelRegistrationNumber: validatedData.hotelRegistrationNumber,
        numberOfRooms: validatedData.numberOfRooms,
        email: validatedData.hotelEmail,
        mobileNumber: validatedData.mobileNumber,
      };

      if (validatedData.hotelType === "PHYSICAL") {
        hotelData.personalId = validatedData.personalId;
      } else if (validatedData.hotelType === "LEGAL") {
        hotelData.legalEntityName = validatedData.legalEntityName;
        hotelData.identificationCode = validatedData.identificationCode;
        hotelData.responsiblePersonName = validatedData.responsiblePersonName;
      }

      const hotel = await tx.hotel.create({
        data: hotelData,
      });

      return { user: newUser, hotel };
    });

    return NextResponse.json(
      {
        message: "სასტუმრო წარმატებით დაემატა",
        hotel: result.hotel,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error("Hotel create error:", error);
    return NextResponse.json(
      { error: "სასტუმროს დამატებისას მოხდა შეცდომა" },
      { status: 500 }
    );
  }
}


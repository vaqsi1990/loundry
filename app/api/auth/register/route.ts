import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Base schema for user registration (always required)
const baseSchema = z.object({
  name: z.string().min(2, "სახელი უნდა შედგებოდეს მინიმუმ 2 სიმბოლოსგან"),
  lastName: z.string().min(2, "გვარი უნდა შედგებოდეს მინიმუმ 2 სიმბოლოსგან"),
  email: z.string().email("გთხოვთ შეიყვანოთ სწორი ელფოსტა"),
  password: z
    .string()
    .min(6, "პაროლი უნდა შედგებოდეს მინიმუმ 6 სიმბოლოსგან"),
  confirmPassword: z.string().min(1, "გთხოვთ დაადასტუროთ პაროლი"),
  mobileNumber: z.string().min(1, "მობილურის ნომერი სავალდებულოა"),
  role: z.enum(["ADMIN", "USER"]).optional().default("USER"),
  // Optional hotel fields
  hotelType: z.enum(["PHYSICAL", "LEGAL"]).optional(),
  hotelName: z.string().optional(),
  hotelRegistrationNumber: z.string().optional(),
  numberOfRooms: z.number().int().positive().optional(),
  hotelEmail: z.string().optional(),
  // Optional fields for both types
  personalId: z.string().optional(),
  legalEntityName: z.string().optional(),
  identificationCode: z.string().optional(),
  responsiblePersonName: z.string().optional(),
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: "პაროლები არ ემთხვევა",
    path: ["confirmPassword"],
  }
).refine(
  (data) => {
    // If role is ADMIN, hotelType should not be provided
    if (data.role === "ADMIN" && data.hotelType) {
      return false;
    }
    return true;
  },
  {
    message: "ადმინისთვის სასტუმროს ველები არ არის საჭირო",
    path: ["hotelType"],
  }
).refine(
  (data) => {
    // If hotelType is provided (PHYSICAL or LEGAL), all hotel fields must be provided
    if (data.hotelType) {
      if (!data.hotelName || !data.hotelRegistrationNumber || !data.numberOfRooms || !data.hotelEmail) {
        return false;
      }
    }
    return true;
  },
  {
    message: "თუ აირჩიეთ სასტუმროს ტიპი, ყველა სასტუმროს ველი სავალდებულოა",
  }
).refine(
  (data) => {
    // Validate hotel email format if provided
    if (data.hotelEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(data.hotelEmail);
    }
    return true;
  },
  {
    message: "გთხოვთ შეიყვანოთ სწორი სასტუმროს ელფოსტა",
  }
).refine(
  (data) => {
    if (data.hotelType === "PHYSICAL") {
      if (!data.personalId) {
        return false;
      }
    }
    return true;
  },
  {
    message: "ფიზიკური პირისთვის პირადი ნომერი სავალდებულოა",
  }
).refine(
  (data) => {
    if (data.hotelType === "LEGAL") {
      if (!data.legalEntityName || !data.identificationCode || !data.responsiblePersonName) {
        return false;
      }
    }
    return true;
  },
  {
    message: "იურიდიული პირისთვის იურიდიული დასახელება, საიდენტიფიკაციო კოდი და პასუხისმგებელი პირი სავალდებულოა",
  }
);

const registerSchema = baseSchema;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = registerSchema.parse(body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "ეს ელფოსტა უკვე გამოყენებულია" },
        { status: 400 }
      );
    }

    // Check if hotel email already exists (only if hotelType is provided)
    if (validatedData.hotelType && validatedData.hotelEmail) {
      const existingHotel = await prisma.hotel.findFirst({
        where: { email: validatedData.hotelEmail },
      });

      if (existingHotel) {
        return NextResponse.json(
          { error: "ეს სასტუმროს ელფოსტა უკვე გამოყენებულია" },
          { status: 400 }
        );
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 10);

    // Create user and optionally hotel in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          name: `${validatedData.name} ${validatedData.lastName}`.trim(),
          email: validatedData.email,
          password: hashedPassword,
          mobileNumber: validatedData.mobileNumber,
          role: validatedData.role || "USER",
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      });

      // Create hotel only if hotelType is provided
      let hotel = null;
      if (validatedData.hotelType) {
        const hotelData: any = {
          type: validatedData.hotelType,
          userId: user.id,
          hotelName: validatedData.hotelName!,
          hotelRegistrationNumber: validatedData.hotelRegistrationNumber!,
          numberOfRooms: validatedData.numberOfRooms!,
          email: validatedData.hotelEmail!,
          mobileNumber: validatedData.mobileNumber,
        };

        if (validatedData.hotelType === "PHYSICAL") {
          hotelData.personalId = validatedData.personalId;
        } else if (validatedData.hotelType === "LEGAL") {
          hotelData.legalEntityName = validatedData.legalEntityName;
          hotelData.identificationCode = validatedData.identificationCode;
          hotelData.responsiblePersonName = validatedData.responsiblePersonName;
        }

        hotel = await tx.hotel.create({
          data: hotelData,
        });
      }

      return { user, hotel };
    });

    return NextResponse.json(
      {
        message: "რეგისტრაცია წარმატებით დასრულდა",
        user: result.user,
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

    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "რეგისტრაციისას მოხდა შეცდომა" },
      { status: 500 }
    );
  }
}

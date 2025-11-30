import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";

const updateProfileSchema = z.object({
  name: z.string().min(2, "სახელი უნდა შედგებოდეს მინიმუმ 2 სიმბოლოსგან").optional(),
  lastName: z.string().min(2, "გვარი უნდა შედგებოდეს მინიმუმ 2 სიმბოლოსგან").optional(),
  email: z.string().email("გთხოვთ შეიყვანოთ სწორი ელფოსტა").optional(),
  password: z.string().min(6, "პაროლი უნდა შედგებოდეს მინიმუმ 6 სიმბოლოსგან").optional(),
  mobileNumber: z.string().optional(),
});

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "არ არის ავტორიზებული" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = updateProfileSchema.parse(body);

    // Check if email is being changed and if it's already taken
    if (validatedData.email && validatedData.email !== session.user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email: validatedData.email },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: "ეს ელფოსტა უკვე გამოყენებულია" },
          { status: 400 }
        );
      }
    }

    const updateData: any = {};

    if (validatedData.name && validatedData.lastName) {
      updateData.name = `${validatedData.name} ${validatedData.lastName}`.trim();
    } else if (validatedData.name) {
      const currentUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true },
      });
      const currentLastName = currentUser?.name?.split(" ").slice(1).join(" ") || "";
      updateData.name = `${validatedData.name} ${currentLastName}`.trim();
    } else if (validatedData.lastName) {
      const currentUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true },
      });
      const currentFirstName = currentUser?.name?.split(" ")[0] || "";
      updateData.name = `${currentFirstName} ${validatedData.lastName}`.trim();
    }

    if (validatedData.email) {
      updateData.email = validatedData.email;
    }

    if (validatedData.mobileNumber !== undefined) {
      updateData.mobileNumber = validatedData.mobileNumber;
    }

    if (validatedData.password) {
      updateData.password = await bcrypt.hash(validatedData.password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        mobileNumber: true,
        createdAt: true,
      },
    });

    // Update mobile number in hotels if provided
    if (validatedData.mobileNumber) {
      const userHotels = await prisma.hotel.findMany({
        where: { userId: session.user.id },
      });

      if (userHotels.length > 0) {
        await prisma.hotel.updateMany({
          where: { userId: session.user.id },
          data: { mobileNumber: validatedData.mobileNumber },
        });
      }
    }

    return NextResponse.json({
      message: "პროფილი წარმატებით განახლდა",
      user: updatedUser,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: "პროფილის განახლებისას მოხდა შეცდომა" },
      { status: 500 }
    );
  }
}


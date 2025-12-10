import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const generatePlaceholderEmail = () =>
  `no-email-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@placeholder.loundry`;

const emailSchema = z.string().trim().email("გთხოვთ შეიყვანოთ სწორი ელფოსტა");

const hotelSchema = z.object({
  hotelType: z.enum(["PHYSICAL", "LEGAL"]),
  hotelName: z.string().min(1, "სასტუმროს დასახელება სავალდებულოა"),
  hotelRegistrationNumber: z.string().min(1, "რეგისტრაციის ნომერი სავალდებულოა"),
  numberOfRooms: z.number().int().positive("ნომრების რაოდენობა უნდა იყოს დადებითი რიცხვი"),
  hotelEmail: emailSchema.optional(),
  mobileNumber: z.string().min(1, "მობილურის ნომერი სავალდებულოა"),
  pricePerKg: z.number().positive("კილოგრამის ფასი უნდა იყოს დადებითი რიცხვი"),
  companyName: z.string().min(1, "შპს დასახელება სავალდებულოა"),
  address: z.string().min(1, "მისამართი სავალდებულოა"),
  // User account fields
  name: z.string().min(1, "სახელი სავალდებულოა").optional(),
  lastName: z.string().min(1, "გვარი სავალდებულოა").optional(),
  email: emailSchema.optional(),
  password: z.string().min(6, "პაროლი უნდა შედგებოდეს მინიმუმ 6 სიმბოლოსგან"),
  confirmPassword: z.string().min(6, "გთხოვთ გაიმეოროთ პაროლი"),
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
}).refine((data) => data.password === data.confirmPassword, {
  message: "პაროლები არ ემთხვევა",
  path: ["confirmPassword"],
}).superRefine((data, ctx) => {
  if (data.hotelType === "LEGAL") {
    if (!data.hotelEmail) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "იურიდიული პირისთვის სასტუმროს ელფოსტა სავალდებულოა",
        path: ["hotelEmail"],
      });
    }
  }

  if (data.hotelType === "PHYSICAL") {
    if (!data.name) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "ფიზიკური პირისთვის სახელი სავალდებულოა",
        path: ["name"],
      });
    }
    if (!data.lastName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "ფიზიკური პირისთვის გვარი სავალდებულოა",
        path: ["lastName"],
      });
    }
  }
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

export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "მიუთითეთ სასტუმროს id" },
        { status: 400 }
      );
    }

    await prisma.hotel.delete({
      where: { id },
    });

    return NextResponse.json({ message: "სასტუმრო წაიშალა" });
  } catch (error) {
    console.error("Our hotel delete error:", error);
    return NextResponse.json(
      { error: "სასტუმროს წაშლისას მოხდა შეცდომა" },
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

    // Parse body with basic logging to debug email validation issues
    let body: any;
    try {
      body = await request.json();
      body.email = body?.email?.trim() || undefined;
      body.hotelEmail = body?.hotelEmail?.trim() || undefined;
      body.name = body?.name?.trim() || undefined;
      body.lastName = body?.lastName?.trim() || undefined;
      body.hotelName = body?.hotelName?.trim();
      body.companyName = body?.companyName?.trim();
      body.address = body?.address?.trim();
      body.hotelRegistrationNumber = body?.hotelRegistrationNumber?.trim();
      console.log("our-hotels POST payload", {
        email: body?.email,
        hotelEmail: body?.hotelEmail,
        hotelType: body?.hotelType,
      });
    } catch (parseErr) {
      console.error("our-hotels payload parse error", parseErr);
      return NextResponse.json({ error: "ვერ წავიკითხეთ მონაცემები" }, { status: 400 });
    }

    // Validate the data
    const validatedData = hotelSchema.parse(body);

    const userEmailForAccount =
      validatedData.email ?? generatePlaceholderEmail();
    const hotelEmailForRecord =
      validatedData.hotelEmail ?? userEmailForAccount;

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: userEmailForAccount },
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
      const displayName =
        `${validatedData.name ?? ""} ${validatedData.lastName ?? ""}`.trim() ||
        validatedData.responsiblePersonName ||
        validatedData.legalEntityName ||
        "User";

      const newUser = await tx.user.create({
        data: {
          name: displayName,
          email: userEmailForAccount,
          password: hashedPassword,
          mobileNumber: validatedData.mobileNumber,
          role: "USER",
        },
      });

      // Create hotel
      const hotelData: any = {
        type: validatedData.hotelType,
        user: { connect: { id: newUser.id } },
        hotelName: validatedData.hotelName,
        hotelRegistrationNumber: validatedData.hotelRegistrationNumber,
        numberOfRooms: validatedData.numberOfRooms,
        email: hotelEmailForRecord,
        mobileNumber: validatedData.mobileNumber,
        pricePerKg: validatedData.pricePerKg,
        companyName: validatedData.companyName,
        address: validatedData.address,
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


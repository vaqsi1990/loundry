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
  companyName: z.string().optional(),
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

const updateHotelSchema = z
  .object({
    hotelType: z.enum(["PHYSICAL", "LEGAL"]).optional(),
    hotelName: z.string().min(1, "სასტუმროს დასახელება სავალდებულოა"),
    hotelRegistrationNumber: z.string().min(1, "რეგისტრაციის ნომერი სავალდებულოა"),
    numberOfRooms: z.number().int().positive("ნომრების რაოდენობა უნდა იყოს დადებითი რიცხვი"),
    hotelEmail: emailSchema.optional(),
    mobileNumber: z.string().min(1, "მობილურის ნომერი სავალდებულოა"),
    pricePerKg: z.number().positive("კილოგრამის ფასი უნდა იყოს დადებითი რიცხვი"),
    companyName: z.string().optional(),
    address: z.string().min(1, "მისამართი სავალდებულოა"),
    name: z.string().optional(),
    lastName: z.string().optional(),
    email: emailSchema.optional(),
    password: z.string().min(6, "პაროლი მინ. 6 სიმბოლო").optional(),
    confirmPassword: z.string().min(6, "გაიმეორეთ პაროლი").optional(),
    personalId: z.string().optional(),
    legalEntityName: z.string().optional(),
    identificationCode: z.string().optional(),
    responsiblePersonName: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.password || data.confirmPassword) {
        return data.password === data.confirmPassword;
      }
      return true;
    },
    { message: "პაროლები არ ემთხვევა", path: ["confirmPassword"] }
  )
  .superRefine((data, ctx) => {
    const type = data.hotelType;
    if (type === "LEGAL") {
      if (!data.hotelEmail) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "იურიდიული პირისთვის სასტუმროს ელფოსტა სავალდებულოა",
          path: ["hotelEmail"],
        });
      }
      if (!data.legalEntityName || !data.identificationCode || !data.responsiblePersonName) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "იურიდიული პირისთვის აუცილებელია შპს დასახელება/საიდენტიფიკაციო/პასუხისმგებელი პირი",
          path: ["legalEntityName"],
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

    if (!user || (user.role !== "ADMIN" && user.role !== "MANAGER" && user.role !== "MANAGER_ASSISTANT")) {
      return NextResponse.json(
        { error: "დაუშვებელია" },
        { status: 403 }
      );
    }

    // Get all hotels (both registered and unregistered)
    const hotels = await prisma.hotel.findMany({
      orderBy: {
        hotelName: "asc",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            mobileNumber: true,
          },
        },
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

    if (!user || (user.role !== "ADMIN" && user.role !== "MANAGER" && user.role !== "MANAGER_ASSISTANT")) {
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
      select: { role: true },
    });

    if (!user || (user.role !== "ADMIN" && user.role !== "MANAGER" && user.role !== "MANAGER_ASSISTANT")) {
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

    const existingHotel = await prisma.hotel.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!existingHotel) {
      return NextResponse.json({ error: "სასტუმრო ვერ მოიძებნა" }, { status: 404 });
    }

    let body: any;
    try {
      body = await request.json();
      body.hotelName = body?.hotelName?.trim();
      body.hotelRegistrationNumber = body?.hotelRegistrationNumber?.trim();
      body.hotelEmail = body?.hotelEmail?.trim() || undefined;
      body.companyName = body?.companyName?.trim();
      body.address = body?.address?.trim();
      body.name = body?.name?.trim();
      body.lastName = body?.lastName?.trim();
      body.email = body?.email?.trim();
      body.personalId = body?.personalId?.trim() || undefined;
      body.identificationCode = body?.identificationCode?.trim() || undefined;
      body.legalEntityName = body?.legalEntityName?.trim() || undefined;
      body.responsiblePersonName = body?.responsiblePersonName?.trim() || undefined;
      body.hotelType = body?.hotelType ?? existingHotel.type;
      body.numberOfRooms = body?.numberOfRooms ? Number(body.numberOfRooms) : body.numberOfRooms;
      body.pricePerKg = body?.pricePerKg ? Number(body.pricePerKg) : body.pricePerKg;
    } catch (parseErr) {
      return NextResponse.json(
        { error: "ვერ წავიკითხეთ მონაცემები" },
        { status: 400 }
      );
    }

    const validatedData = updateHotelSchema.parse(body);

    // Update user if present and data provided
    if (existingHotel.userId && existingHotel.user) {
      const userUpdates: any = {};
      if (validatedData.email && validatedData.email !== existingHotel.user.email) {
        const dup = await prisma.user.findUnique({
          where: { email: validatedData.email },
          select: { id: true },
        });
        if (dup && dup.id !== existingHotel.userId) {
          return NextResponse.json({ error: "ეს ელფოსტა უკვე გამოყენებულია" }, { status: 400 });
        }
        userUpdates.email = validatedData.email;
      }
      if (validatedData.mobileNumber) {
        userUpdates.mobileNumber = validatedData.mobileNumber;
      }
      const displayName =
        `${validatedData.name ?? ""} ${validatedData.lastName ?? ""}`.trim() ||
        existingHotel.user.name ||
        undefined;
      if (displayName) {
        userUpdates.name = displayName;
      }
      if (validatedData.password) {
        userUpdates.password = await bcrypt.hash(validatedData.password, 10);
      }

      if (Object.keys(userUpdates).length > 0) {
        await prisma.user.update({
          where: { id: existingHotel.userId },
          data: userUpdates,
        });
      }
    }

    const updated = await prisma.hotel.update({
      where: { id },
      data: {
        type: validatedData.hotelType ?? existingHotel.type,
        hotelName: validatedData.hotelName,
        hotelRegistrationNumber: validatedData.hotelRegistrationNumber,
        numberOfRooms: validatedData.numberOfRooms,
        email: validatedData.hotelEmail ?? existingHotel.email,
        mobileNumber: validatedData.mobileNumber,
        pricePerKg: validatedData.pricePerKg,
        companyName: validatedData.companyName ?? null,
        address: validatedData.address,
        personalId:
          (validatedData.hotelType ?? existingHotel.type) === "PHYSICAL"
            ? (validatedData.personalId?.trim() || existingHotel.personalId) ?? null
            : null,
        legalEntityName:
          (validatedData.hotelType ?? existingHotel.type) === "LEGAL"
            ? (validatedData.legalEntityName?.trim() || existingHotel.legalEntityName) ?? null
            : null,
        identificationCode:
          (validatedData.hotelType ?? existingHotel.type) === "LEGAL"
            ? (validatedData.identificationCode?.trim() || existingHotel.identificationCode) ?? null
            : null,
        responsiblePersonName:
          (validatedData.hotelType ?? existingHotel.type) === "LEGAL"
            ? (validatedData.responsiblePersonName?.trim() || existingHotel.responsiblePersonName) ?? null
            : null,
      },
    });

    return NextResponse.json({ message: "განახლდა", hotel: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error("Our hotel update error:", error);
    return NextResponse.json(
      { error: "სასტუმროს განახლებისას მოხდა შეცდომა" },
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

    if (!user || (user.role !== "ADMIN" && user.role !== "MANAGER" && user.role !== "MANAGER_ASSISTANT")) {
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
      body.personalId = body?.personalId?.trim() || undefined;
      body.identificationCode = body?.identificationCode?.trim() || undefined;
      body.legalEntityName = body?.legalEntityName?.trim() || undefined;
      body.responsiblePersonName = body?.responsiblePersonName?.trim() || undefined;
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
        companyName: validatedData.companyName ?? null,
        address: validatedData.address,
      };

      if (validatedData.hotelType === "PHYSICAL") {
        hotelData.personalId = validatedData.personalId?.trim() || null;
      } else if (validatedData.hotelType === "LEGAL") {
        hotelData.legalEntityName = validatedData.legalEntityName?.trim() || null;
        hotelData.identificationCode = validatedData.identificationCode?.trim() || null;
        hotelData.responsiblePersonName = validatedData.responsiblePersonName?.trim() || null;
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


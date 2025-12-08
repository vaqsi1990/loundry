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
      select: { role: true },
    });

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "დაუშვებელია" },
        { status: 403 }
      );
    }

    const sheets = await prisma.dailySheet.findMany({
      include: {
        items: {
          orderBy: {
            category: "asc",
          },
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    return NextResponse.json(sheets);
  } catch (error) {
    console.error("Daily sheets fetch error:", error);
    return NextResponse.json(
      { error: "დღის ფურცლების ჩატვირთვისას მოხდა შეცდომა" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  let body: any = null;
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

    body = await request.json();
    const { date, hotelName, roomNumber, description, notes, items } = body;

    if (!date) {
      return NextResponse.json(
        { error: "თარიღი აუცილებელია" },
        { status: 400 }
      );
    }

    if (!hotelName) {
      return NextResponse.json(
        { error: "სასტუმროს სახელი აუცილებელია" },
        { status: 400 }
      );
    }

    // Validate and format date for Prisma (Date only, no time)
    // Use UTC to avoid timezone issues - we want to store the exact date without time conversion
    let dateObj: Date;
    if (typeof date === 'string') {
      // Parse date string (YYYY-MM-DD format)
      const dateStr = date.split('T')[0]; // Get only the date part
      const dateParts = dateStr.split('-');
      if (dateParts.length === 3) {
        const year = parseInt(dateParts[0], 10);
        const month = parseInt(dateParts[1], 10) - 1; // Month is 0-indexed
        const day = parseInt(dateParts[2], 10);
        // Create date in UTC to avoid timezone conversion issues
        dateObj = new Date(Date.UTC(year, month, day, 12, 0, 0, 0)); // Use noon UTC to avoid day shift
      } else {
        // Fallback: parse the date string
        const parsed = new Date(date);
        if (!isNaN(parsed.getTime())) {
          // Extract date parts and create UTC date
          const year = parsed.getUTCFullYear();
          const month = parsed.getUTCMonth();
          const day = parsed.getUTCDate();
          dateObj = new Date(Date.UTC(year, month, day, 12, 0, 0, 0));
        } else {
          dateObj = new Date(date);
        }
      }
    } else if (date instanceof Date) {
      // Extract date parts from existing Date object and create UTC date
      const year = date.getUTCFullYear();
      const month = date.getUTCMonth();
      const day = date.getUTCDate();
      dateObj = new Date(Date.UTC(year, month, day, 12, 0, 0, 0));
    } else {
      dateObj = new Date(date);
    }
    
    if (isNaN(dateObj.getTime())) {
      return NextResponse.json(
        { error: "არასწორი თარიღის ფორმატი" },
        { status: 400 }
      );
    }

    // Validate items if provided
    if (items && Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        if (!item.category) {
          return NextResponse.json(
            { error: "ყველა ნივთს უნდა ჰქონდეს კატეგორია" },
            { status: 400 }
          );
        }
        if (!item.itemNameKa) {
          return NextResponse.json(
            { error: "ყველა ნივთს უნდა ჰქონდეს სახელი" },
            { status: 400 }
          );
        }
        if (item.weight === undefined || item.weight === null) {
          return NextResponse.json(
            { error: "ყველა ნივთს უნდა ჰქონდეს წონა" },
            { status: 400 }
          );
        }
        if (item.totalWeight === undefined || item.totalWeight === null) {
          return NextResponse.json(
            { error: "ყველა ნივთს უნდა ჰქონდეს მთლიანი წონა" },
            { status: 400 }
          );
        }
      }
    }

    // Prepare data for Prisma - convert empty strings to null
    // Ensure hotelName is not empty (it's required in validation but optional in schema)
    const cleanHotelName = hotelName && String(hotelName).trim() ? String(hotelName).trim() : null;
    
    // Get pricePerKg from hotel
    let pricePerKg: number | null = null;
    if (cleanHotelName) {
      const hotel = await prisma.hotel.findFirst({
        where: { hotelName: cleanHotelName },
        select: { pricePerKg: true },
      });
      pricePerKg = hotel?.pricePerKg ?? null;
    }
    
    const prismaData = {
      date: dateObj,
      hotelName: cleanHotelName,
      roomNumber: (roomNumber && String(roomNumber).trim()) ? String(roomNumber).trim() : null,
      description: (description && String(description).trim()) ? String(description).trim() : null,
      notes: (notes && String(notes).trim()) ? String(notes).trim() : null,
      pricePerKg: pricePerKg,
      items: {
        create: (items && Array.isArray(items) ? items : [])
        .filter((item: any) => {
          // Filter out invalid items
          if (!item || !item.category || !item.itemNameKa) {
            console.warn("Filtering out invalid item:", item);
            return false;
          }
          return true;
        })
        .map((item: any) => {
          // Ensure all required fields are present and valid
          const weight = typeof item.weight === 'number' ? item.weight : (Number(item.weight) || 0);
          const totalWeight = typeof item.totalWeight === 'number' ? item.totalWeight : (Number(item.totalWeight) || 0);
          
          if (isNaN(weight) || isNaN(totalWeight)) {
            throw new Error(`Invalid numeric value for item ${item.itemNameKa}: weight=${item.weight}, totalWeight=${item.totalWeight}`);
          }
          
          return {
            category: String(item.category).trim(),
            itemNameKa: String(item.itemNameKa).trim(),
            weight: weight,
            received: typeof item.received === 'number' ? item.received : (Number(item.received) || 0),
            washCount: typeof item.washCount === 'number' ? item.washCount : (Number(item.washCount) || 0),
            dispatched: typeof item.dispatched === 'number' ? item.dispatched : (Number(item.dispatched) || 0),
            shortage: typeof item.shortage === 'number' ? item.shortage : (Number(item.shortage) || 0),
            totalWeight: totalWeight,
            comment: (item.comment && String(item.comment).trim()) ? String(item.comment).trim() : null,
          };
        }),
      },
    };

    // Log the data we're about to send to Prisma
    console.log("Creating daily sheet with data:");
    console.log("- date:", dateObj, "type:", typeof dateObj, "ISO:", dateObj.toISOString());
    console.log("- hotelName:", hotelName, "type:", typeof hotelName, "value:", JSON.stringify(hotelName));
    console.log("- roomNumber:", roomNumber, "type:", typeof roomNumber, "value:", JSON.stringify(roomNumber));
    console.log("- description:", description, "type:", typeof description, "value:", JSON.stringify(description));
    console.log("- notes:", notes, "type:", typeof notes, "value:", JSON.stringify(notes));
    console.log("- items count:", prismaData.items.create.length);
    
    // Validate all items before creating
    for (let i = 0; i < prismaData.items.create.length; i++) {
      const item = prismaData.items.create[i];
      console.log(`Validating item ${i}:`, {
        category: item.category,
        itemNameKa: item.itemNameKa,
        weight: item.weight,
        totalWeight: item.totalWeight,
        received: item.received,
        washCount: item.washCount,
        dispatched: item.dispatched,
        shortage: item.shortage,
      });
      
      if (!item.category || !item.itemNameKa || item.weight === undefined || item.weight === null || item.totalWeight === undefined || item.totalWeight === null) {
        console.error(`Invalid item at index ${i}:`, item);
        throw new Error(`Invalid item at index ${i}: missing required fields`);
      }
    }

    // Log the complete data structure
    console.log("Complete Prisma data structure:");
    console.log(JSON.stringify({
      date: dateObj.toISOString(),
      hotelName: prismaData.hotelName,
      roomNumber: prismaData.roomNumber,
      description: prismaData.description,
      notes: prismaData.notes,
      items: prismaData.items.create.map((item: any, idx: number) => ({
        index: idx,
        category: item.category,
        itemNameKa: item.itemNameKa,
        weight: item.weight,
        totalWeight: item.totalWeight,
        received: item.received,
        washCount: item.washCount,
        dispatched: item.dispatched,
        shortage: item.shortage,
        comment: item.comment,
      })),
    }, null, 2));

    // Try to create the sheet
    let sheet;
    try {
      sheet = await prisma.dailySheet.create({
        data: prismaData,
        include: {
          items: true,
        },
      });
    } catch (createError: any) {
      console.error("Prisma create error details:");
      console.error("- Error code:", createError?.code);
      console.error("- Error message:", createError?.message);
      console.error("- Error meta:", JSON.stringify(createError?.meta, null, 2));
      console.error("- Error cause:", createError?.cause);
      console.error("- Full error:", JSON.stringify(createError, Object.getOwnPropertyNames(createError), 2));
      
      // Log the exact data that was sent
      console.error("Data that was sent to Prisma:");
      console.error(JSON.stringify({
        date: dateObj.toISOString(),
        hotelName: prismaData.hotelName,
        roomNumber: prismaData.roomNumber,
        description: prismaData.description,
        notes: prismaData.notes,
        itemsCount: prismaData.items.create.length,
        firstItem: prismaData.items.create[0],
        lastItem: prismaData.items.create[prismaData.items.create.length - 1],
      }, null, 2));
      
      throw createError;
    }

    return NextResponse.json(sheet, { status: 201 });
  } catch (error) {
    console.error("Daily sheet create error:", error);
    console.error("Request body:", body);
    
    // Provide more specific error messages
    if (error instanceof Error && 'code' in error) {
      const prismaError = error as any;
      if (prismaError.code === 'P2011') {
        return NextResponse.json(
          { error: "დაკარგულია სავალდებულო ველი. გთხოვთ შეამოწმოთ, რომ ყველა ველი შევსებულია." },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { error: "დღის ფურცლის დამატებისას მოხდა შეცდომა" },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import bcrypt from "bcryptjs";

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

    const employees = await prisma.employee.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(employees);
  } catch (error) {
    console.error("Employees fetch error:", error);
    return NextResponse.json(
      { error: "თანამშრომლების ჩატვირთვისას მოხდა შეცდომა" },
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

    const formData = await request.formData();
    const name = formData.get("name") as string;
    const personalId = formData.get("personalId") as string | null;
    const phone = formData.get("phone") as string;
    const position = formData.get("position") as string;
    const canLogin = formData.get("canLogin") === "true";
    const contractFile = formData.get("contractFile") as File | null;
    const email = formData.get("email") as string | null;
    const password = formData.get("password") as string | null;

    // Validate email and password if canLogin is true
    if (canLogin) {
      if (!email || !email.trim()) {
        return NextResponse.json(
          { error: "ელფოსტა სავალდებულოა, როცა შესვლა ჩართულია" },
          { status: 400 }
        );
      }
      if (!password || password.length < 6) {
        return NextResponse.json(
          { error: "პაროლი სავალდებულოა და უნდა შედგებოდეს მინიმუმ 6 სიმბოლოსგან" },
          { status: 400 }
        );
      }

      // Check if email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: email.trim() },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: "ეს ელფოსტა უკვე გამოყენებულია" },
          { status: 400 }
        );
      }

      // Check if employee with this email already exists
      const existingEmployee = await prisma.employee.findUnique({
        where: { email: email.trim() },
      });

      if (existingEmployee) {
        return NextResponse.json(
          { error: "ეს ელფოსტა უკვე გამოყენებულია" },
          { status: 400 }
        );
      }
    }

    let contractFilePath: string | null = null;

    if (contractFile) {
      const bytes = await contractFile.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const uploadsDir = join(process.cwd(), "public", "uploads", "contracts");
      await mkdir(uploadsDir, { recursive: true });

      const fileName = `${Date.now()}-${contractFile.name}`;
      contractFilePath = `/uploads/contracts/${fileName}`;
      const filePath = join(uploadsDir, fileName);

      await writeFile(filePath, buffer);
    }

    // Determine user role based on position
    let userRole: "MANAGER" | "MANAGER_ASSISTANT" | "COURIER" = "COURIER";
    if (position === "MANAGER") {
      userRole = "MANAGER";
    } else if (position === "MANAGER_ASSISTANT") {
      userRole = "MANAGER_ASSISTANT";
    } else if (position === "COURIER") {
      userRole = "COURIER";
    }

    // Create employee and optionally user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create employee
      const employee = await tx.employee.create({
        data: {
          name,
          personalId: personalId || null,
          phone,
          position: position as any,
          canLogin,
          contractFile: contractFilePath,
          email: canLogin && email ? email.trim() : null,
        },
      });

      // Create user if canLogin is true
      if (canLogin && email && password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        await tx.user.create({
          data: {
            name: employee.name,
            email: email.trim(),
            password: hashedPassword,
            mobileNumber: phone,
            role: userRole,
          },
        });
      }

      return employee;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Employee create error:", error);
    return NextResponse.json(
      { error: "თანამშრომლის დამატებისას მოხდა შეცდომა" },
      { status: 500 }
    );
  }
}


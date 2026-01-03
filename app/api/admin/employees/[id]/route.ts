import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { writeFile, mkdir, unlink } from "fs/promises";
import { join } from "path";
import bcrypt from "bcryptjs";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const formData = await request.formData();
    const name = formData.get("name") as string;
    const personalId = formData.get("personalId") as string | null;
    const phone = formData.get("phone") as string;
    const position = formData.get("position") as string;
    const canLogin = formData.get("canLogin") === "true";
    const contractFile = formData.get("contractFile") as File | null;
    const email = formData.get("email") as string | null;
    const password = formData.get("password") as string | null;

    const existingEmployee = await prisma.employee.findUnique({
      where: { id },
    });

    if (!existingEmployee) {
      return NextResponse.json(
        { error: "თანამშრომელი არ მოიძებნა" },
        { status: 404 }
      );
    }

    // Validate email and password if canLogin is true
    if (canLogin) {
      if (!email || !email.trim()) {
        return NextResponse.json(
          { error: "ელფოსტა სავალდებულოა, როცა შესვლა ჩართულია" },
          { status: 400 }
        );
      }

      // Check if email is already used by another employee
      if (email.trim() !== existingEmployee.email) {
        const emailInUse = await prisma.employee.findUnique({
          where: { email: email.trim() },
        });

        if (emailInUse) {
          return NextResponse.json(
            { error: "ეს ელფოსტა უკვე გამოყენებულია" },
            { status: 400 }
          );
        }

        // Check if email is already used by a user
        const emailInUseByUser = await prisma.user.findUnique({
          where: { email: email.trim() },
        });

        if (emailInUseByUser) {
          return NextResponse.json(
            { error: "ეს ელფოსტა უკვე გამოყენებულია" },
            { status: 400 }
          );
        }
      }

      // If password is provided, validate it
      if (password && password.length > 0 && password.length < 6) {
        return NextResponse.json(
          { error: "პაროლი უნდა შედგებოდეს მინიმუმ 6 სიმბოლოსგან" },
          { status: 400 }
        );
      }
    }

    let contractFilePath = existingEmployee.contractFile;

    if (contractFile) {
      // Delete old file if exists
      if (existingEmployee.contractFile) {
        try {
          const oldFilePath = join(process.cwd(), "public", existingEmployee.contractFile);
          await unlink(oldFilePath);
        } catch (err) {
          // File might not exist, ignore
        }
      }

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

    // Update employee and optionally user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update employee
      const employee = await tx.employee.update({
        where: { id },
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

      // Handle user account
      if (canLogin && email) {
        const existingUser = await tx.user.findUnique({
          where: { email: existingEmployee.email || "" },
        });

        if (existingUser) {
          // Update existing user
          const updateData: any = {
            name: employee.name,
            email: email.trim(),
            mobileNumber: phone,
            role: userRole,
          };

          if (password && password.length > 0) {
            updateData.password = await bcrypt.hash(password, 10);
          }

          await tx.user.update({
            where: { id: existingUser.id },
            data: updateData,
          });
        } else {
          // Create new user
          if (!password || password.length < 6) {
            throw new Error("პაროლი სავალდებულოა ახალი მომხმარებლისთვის");
          }

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
      } else if (!canLogin && existingEmployee.email) {
        // If canLogin is disabled, delete user account if exists
        const existingUser = await tx.user.findUnique({
          where: { email: existingEmployee.email },
        });

        if (existingUser) {
          await tx.user.delete({
            where: { id: existingUser.id },
          });
        }
      }

      return employee;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Employee update error:", error);
    return NextResponse.json(
      { error: "თანამშრომლის განახლებისას მოხდა შეცდომა" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    const employee = await prisma.employee.findUnique({
      where: { id },
    });

    if (!employee) {
      return NextResponse.json(
        { error: "თანამშრომელი არ მოიძებნა" },
        { status: 404 }
      );
    }

    // Delete contract file if exists
    if (employee.contractFile) {
      try {
        const filePath = join(process.cwd(), "public", employee.contractFile);
        await unlink(filePath);
      } catch (err) {
        // File might not exist, ignore
      }
    }

    await prisma.employee.delete({
      where: { id },
    });

    return NextResponse.json({ message: "თანამშრომელი წაიშალა" });
  } catch (error) {
    console.error("Employee delete error:", error);
    return NextResponse.json(
      { error: "თანამშრომლის წაშლისას მოხდა შეცდომა" },
      { status: 500 }
    );
  }
}


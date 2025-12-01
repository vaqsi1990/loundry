import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { writeFile, mkdir, unlink } from "fs/promises";
import { join } from "path";

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
    const email = formData.get("email") as string | null;
    const phone = formData.get("phone") as string;
    const position = formData.get("position") as string;
    const canLogin = formData.get("canLogin") === "true";
    const contractFile = formData.get("contractFile") as File | null;

    const existingEmployee = await prisma.employee.findUnique({
      where: { id },
    });

    if (!existingEmployee) {
      return NextResponse.json(
        { error: "თანამშრომელი არ მოიძებნა" },
        { status: 404 }
      );
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

    const employee = await prisma.employee.update({
      where: { id },
      data: {
        name,
        email: email || null,
        phone,
        position: position as any,
        canLogin,
        contractFile: contractFilePath,
      },
    });

    return NextResponse.json(employee);
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


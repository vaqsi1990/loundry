import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

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

    if (!user || user.role !== "ADMIN") {
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

    const employee = await prisma.employee.create({
      data: {
        name,
        personalId: personalId || null,
        phone,
        position: position as any,
        canLogin,
        contractFile: contractFilePath,
      },
    });

    return NextResponse.json(employee, { status: 201 });
  } catch (error) {
    console.error("Employee create error:", error);
    return NextResponse.json(
      { error: "თანამშრომლის დამატებისას მოხდა შეცდომა" },
      { status: 500 }
    );
  }
}


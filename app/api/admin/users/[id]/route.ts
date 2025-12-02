import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function PATCH(
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

    // Check if user is admin
    const adminUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!adminUser || adminUser.role !== "ADMIN") {
      return NextResponse.json(
        { error: "დაუშვებელია" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { role } = body;

    // Validate role
    if (!["USER", "MANAGER", "MANAGER_ASSISTANT", "COURIER", "ACCOUNTANT"].includes(role)) {
      return NextResponse.json(
        { error: "არასწორი როლი" },
        { status: 400 }
      );
    }

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { role: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "მომხმარებელი არ მოიძებნა" },
        { status: 404 }
      );
    }

    // Prevent changing admin role
    if (targetUser.role === "ADMIN") {
      return NextResponse.json(
        { error: "ადმინისტრატორის როლის შეცვლა დაუშვებელია" },
        { status: 403 }
      );
    }

    // Prevent changing own role
    if (id === session.user.id) {
      return NextResponse.json(
        { error: "საკუთარი როლის შეცვლა დაუშვებელია" },
        { status: 403 }
      );
    }

    // Update user role
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        mobileNumber: true,
        createdAt: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Role update error:", error);
    return NextResponse.json(
      { error: "როლის შეცვლისას მოხდა შეცდომა" },
      { status: 500 }
    );
  }
}


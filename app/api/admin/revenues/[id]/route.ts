import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

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

    // Check if revenue exists
    const revenue = await prisma.revenue.findUnique({
      where: { id },
    });

    if (!revenue) {
      return NextResponse.json(
        { error: "შემოსავალი ვერ მოიძებნა" },
        { status: 404 }
      );
    }

    await prisma.revenue.delete({
      where: { id },
    });

    return NextResponse.json({ message: "შემოსავალი წაიშალა" });
  } catch (error) {
    console.error("Revenue delete error:", error);
    
    // Check if it's a Prisma error (e.g., record not found, foreign key constraint)
    if (error instanceof Error) {
      // If it's a known Prisma error, return a more specific message
      if (error.message.includes("Record to delete does not exist")) {
        return NextResponse.json(
          { error: "შემოსავალი ვერ მოიძებნა" },
          { status: 404 }
        );
      }
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "შემოსავლის წაშლისას მოხდა შეცდომა" },
      { status: 500 }
    );
  }
}

